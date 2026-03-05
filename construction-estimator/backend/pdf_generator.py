"""
PDF Report Generator using ReportLab.
Generates BOQ and Engineering Reports.
"""
from io import BytesIO
from datetime import datetime
from typing import List

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph,
        Spacer, HRFlowable, PageBreak
    )
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

# Brand colours
NAVY   = colors.HexColor('#0f3460') if HAS_REPORTLAB else None
ACCENT = colors.HexColor('#e94560') if HAS_REPORTLAB else None
LIGHT  = colors.HexColor('#f0f4f8') if HAS_REPORTLAB else None
GREY   = colors.HexColor('#6c757d') if HAS_REPORTLAB else None


def _no_reportlab() -> BytesIO:
    buf = BytesIO()
    buf.write(b"PDF generation unavailable.\nInstall ReportLab: pip install reportlab")
    buf.seek(0)
    return buf


def _base_doc(buf: BytesIO) -> "SimpleDocTemplate":
    return SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.8*cm, rightMargin=1.8*cm,
        topMargin=2*cm,    bottomMargin=2*cm,
    )


def _table_style_header(header_color=None):
    if header_color is None:
        header_color = NAVY
    return TableStyle([
        ('BACKGROUND',  (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR',   (0, 0), (-1, 0), colors.white),
        ('FONTNAME',    (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, 0), 8),
        ('ALIGN',       (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME',    (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',    (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT]),
        ('GRID',        (0, 0), (-1, -1), 0.4, colors.HexColor('#dee2e6')),
        ('PADDING',     (0, 0), (-1, -1), 4),
        ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
    ])


# ---------------------------------------------------------------------------
# BOQ PDF
# ---------------------------------------------------------------------------
def generate_boq_pdf(project, estimates) -> BytesIO:
    if not HAS_REPORTLAB:
        return _no_reportlab()

    buf = BytesIO()
    doc = _base_doc(buf)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('T', parent=styles['Title'],   fontSize=18, textColor=NAVY,   spaceAfter=4)
    sub_style   = ParagraphStyle('S', parent=styles['Heading2'],fontSize=11, textColor=ACCENT, spaceAfter=2)
    cat_style   = ParagraphStyle('C', parent=styles['Heading3'],fontSize=9,  textColor=NAVY,   spaceBefore=8, spaceAfter=2)
    note_style  = ParagraphStyle('N', parent=styles['Normal'],  fontSize=7,  textColor=GREY)

    story = []

    # ── Header ──
    story.append(Paragraph("BILL OF QUANTITIES", title_style))
    story.append(Paragraph("Plumbing &amp; Construction Works", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=NAVY))
    story.append(Spacer(1, 0.4*cm))

    # ── Project info ──
    info = [
        ["Project:", project.project_name or "—",     "Date:",          datetime.now().strftime("%d %B %Y")],
        ["Location:", project.location or "—",        "Building Type:", project.building_type or "—"],
        ["Floors:",   str(project.floors or "—"),      "Water Source:",  project.water_source or "—"],
    ]
    t = Table(info, colWidths=[3*cm, 7*cm, 3.5*cm, 5*cm])
    t.setStyle(TableStyle([
        ('FONTNAME',  (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',  (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME',  (1, 0), (1, -1), 'Helvetica'),
        ('FONTNAME',  (3, 0), (3, -1), 'Helvetica'),
        ('FONTSIZE',  (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [LIGHT, colors.white]),
        ('PADDING',   (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))

    # ── Items by category ──
    categories: dict = {}
    for e in estimates:
        cat = e.category or "Other"
        categories.setdefault(cat, []).append(e)

    grand_total  = 0.0
    material_cost = 0.0
    labor_cost    = 0.0

    for cat_name, items in categories.items():
        story.append(Paragraph(cat_name.upper(), cat_style))
        rows = [["#", "Description", "Size", "Unit", "Qty", "Unit Price (₱)", "Total (₱)"]]
        cat_total = 0.0
        for i, e in enumerate(items, 1):
            total = e.total_cost or 0
            cat_total   += total
            grand_total += total
            if cat_name == "Labor":
                labor_cost += total
            else:
                material_cost += total
            rows.append([
                str(i),
                e.item_name,
                e.size or "—",
                e.unit or "—",
                f"{e.quantity:,.0f}" if e.quantity else "0",
                f"₱{e.unit_price:,.2f}" if e.unit_price else "₱0.00",
                f"₱{total:,.2f}",
            ])
        rows.append(["", f"Subtotal — {cat_name}", "", "", "", "", f"₱{cat_total:,.2f}"])

        tbl = Table(rows, colWidths=[0.8*cm, 5.5*cm, 1.8*cm, 1.4*cm, 1.4*cm, 3*cm, 2.8*cm], repeatRows=1)
        style = _table_style_header()
        style.add('FONTNAME',   (0, -1), (-1, -1), 'Helvetica-Bold')
        style.add('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e8ecf0'))
        style.add('ALIGN',      (4, 0),  (-1, -1), 'RIGHT')
        tbl.setStyle(style)
        story.append(tbl)
        story.append(Spacer(1, 0.2*cm))

    # ── Grand total ──
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#adb5bd')))
    totals = [
        ["Total Material Cost", f"₱{material_cost:,.2f}"],
        ["Total Labor Cost",    f"₱{labor_cost:,.2f}"],
        ["GRAND TOTAL",         f"₱{grand_total:,.2f}"],
    ]
    tt = Table(totals, colWidths=[13*cm, 5*cm])
    tt.setStyle(TableStyle([
        ('FONTNAME',   (0, 0), (-1, -2), 'Helvetica'),
        ('FONTNAME',   (0, -1),(-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE',   (0, 0), (-1, -1), 10),
        ('ALIGN',      (1, 0), (1, -1),  'RIGHT'),
        ('BACKGROUND', (0, -1),(-1, -1), NAVY),
        ('TEXTCOLOR',  (0, -1),(-1, -1), colors.white),
        ('PADDING',    (0, 0), (-1, -1), 6),
    ]))
    story.append(tt)
    story.append(Spacer(1, 0.8*cm))
    story.append(Paragraph(
        "Prices are based on current Philippine market rates and may be subject to change. "
        "This BOQ is generated for estimation purposes only.", note_style
    ))

    doc.build(story)
    buf.seek(0)
    return buf


# ---------------------------------------------------------------------------
# Engineering Report PDF
# ---------------------------------------------------------------------------
def generate_engineering_report(project, estimates, fixtures) -> BytesIO:
    if not HAS_REPORTLAB:
        return _no_reportlab()

    buf = BytesIO()
    doc = _base_doc(buf)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('T',  parent=styles['Title'],   fontSize=20, textColor=NAVY, alignment=TA_CENTER, spaceAfter=4)
    h1_style    = ParagraphStyle('H1', parent=styles['Heading1'],fontSize=13, textColor=NAVY, spaceBefore=10, spaceAfter=4)
    h2_style    = ParagraphStyle('H2', parent=styles['Heading2'],fontSize=10, textColor=colors.HexColor('#16213e'), spaceBefore=6, spaceAfter=2)
    note_style  = ParagraphStyle('N',  parent=styles['Normal'],  fontSize=7,  textColor=GREY)

    story = []

    # ── Cover ──
    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph("PLUMBING ENGINEERING REPORT", title_style))
    story.append(Paragraph(project.project_name or "Untitled Project",
                            ParagraphStyle('P', parent=styles['Heading1'], fontSize=16,
                                           textColor=ACCENT, alignment=TA_CENTER)))
    story.append(Spacer(1, 0.8*cm))
    story.append(HRFlowable(width="100%", thickness=3, color=NAVY))
    story.append(Spacer(1, 0.6*cm))

    info = [
        ["Field", "Details"],
        ["Project Name",   project.project_name  or "—"],
        ["Location",       project.location       or "—"],
        ["Building Type",  project.building_type  or "—"],
        ["Number of Floors", str(project.floors   or "—")],
        ["Water Source",   project.water_source   or "—"],
        ["Tank Capacity",  f"{project.tank_capacity:,.0f} L" if project.tank_capacity else "—"],
        ["Report Date",    datetime.now().strftime("%d %B %Y")],
    ]
    tbl = Table(info, colWidths=[5*cm, 12*cm])
    tbl.setStyle(_table_style_header())
    story.append(tbl)
    story.append(PageBreak())

    # ── Cost Summary ──
    story.append(Paragraph("COST ESTIMATE SUMMARY", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#dee2e6')))
    story.append(Spacer(1, 0.3*cm))

    mat_cost   = sum(e.total_cost or 0 for e in estimates if e.category != "Labor")
    lab_cost   = sum(e.total_cost or 0 for e in estimates if e.category == "Labor")
    grand      = mat_cost + lab_cost

    summary = [
        ["Cost Component",   "Amount (₱)"],
        ["Material Costs",   f"₱{mat_cost:,.2f}"],
        ["Labor Costs",      f"₱{lab_cost:,.2f}"],
        ["GRAND TOTAL",      f"₱{grand:,.2f}"],
    ]
    st = Table(summary, colWidths=[10*cm, 7*cm])
    st.setStyle(TableStyle([
        ('BACKGROUND',  (0, 0),  (-1, 0),  NAVY),
        ('TEXTCOLOR',   (0, 0),  (-1, 0),  colors.white),
        ('FONTNAME',    (0, 0),  (-1, 0),  'Helvetica-Bold'),
        ('FONTNAME',    (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND',  (0, -1), (-1, -1), ACCENT),
        ('TEXTCOLOR',   (0, -1), (-1, -1), colors.white),
        ('FONTSIZE',    (0, 0),  (-1, -1), 10),
        ('ALIGN',       (1, 0),  (1, -1),  'RIGHT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, LIGHT]),
        ('GRID',        (0, 0),  (-1, -1), 0.4, colors.HexColor('#dee2e6')),
        ('PADDING',     (0, 0),  (-1, -1), 6),
    ]))
    story.append(st)
    story.append(Spacer(1, 0.8*cm))

    # ── BOQ Details ──
    story.append(Paragraph("BILL OF QUANTITIES", h1_style))
    cats: dict = {}
    for e in estimates:
        cats.setdefault(e.category or "Other", []).append(e)

    for cat_name, items in cats.items():
        story.append(Paragraph(cat_name, h2_style))
        rows = [["Item", "Size", "Unit", "Qty", "Unit Price", "Total"]]
        cat_total = 0.0
        for e in items:
            t = e.total_cost or 0
            cat_total += t
            rows.append([
                e.item_name, e.size or "—", e.unit or "—",
                f"{e.quantity:,.0f}" if e.quantity else "0",
                f"₱{e.unit_price:,.2f}" if e.unit_price else "₱0",
                f"₱{t:,.2f}",
            ])
        rows.append(["Subtotal", "", "", "", "", f"₱{cat_total:,.2f}"])
        ct = Table(rows, colWidths=[5.5*cm, 1.8*cm, 1.4*cm, 1.4*cm, 2.8*cm, 2.8*cm], repeatRows=1)
        s2 = _table_style_header(colors.HexColor('#16213e'))
        s2.add('FONTNAME',   (0, -1), (-1, -1), 'Helvetica-Bold')
        s2.add('BACKGROUND', (0, -1), (-1, -1), LIGHT)
        s2.add('ALIGN',      (3, 0),  (-1, -1), 'RIGHT')
        ct.setStyle(s2)
        story.append(ct)
        story.append(Spacer(1, 0.2*cm))

    # ── Disclaimer ──
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#dee2e6')))
    story.append(Paragraph(
        "DISCLAIMER: This report is generated by automated calculations and must be "
        "verified by a licensed engineer before use in construction. "
        "Material prices are subject to market fluctuations.", note_style
    ))

    doc.build(story)
    buf.seek(0)
    return buf
