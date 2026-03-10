export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-dark text-gray-300 px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Refund Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: March 10, 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">30-Day Free Trial</h2>
          <p>
            All new users receive a 30-day free trial. During the trial period, you are not charged.
            If the Service does not meet your needs, simply do not subscribe — no payment will be
            collected.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Subscription Refunds</h2>
          <p>
            Since all plans include a 30-day free trial, refunds are generally not provided after
            the trial period ends and a paid subscription begins. We encourage users to fully
            evaluate the Service during the trial before subscribing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Exceptions</h2>
          <p>
            Refunds may be granted at our discretion in the following cases:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Duplicate charges due to a billing error</li>
            <li>Extended service outage that prevented access for a significant portion of the billing period</li>
            <li>Accidental renewal within 48 hours of the charge date, where the user did not use the Service during that period</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Cancellation</h2>
          <p>
            You may cancel your subscription at any time through the billing portal. Cancellation
            takes effect at the end of the current billing period — you will continue to have access
            until then. No partial refunds are provided for unused time within a billing cycle.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">How to Request a Refund</h2>
          <p>
            To request a refund under the exceptions listed above, contact us at
            support@engestpro.com with your account email, the charge date, and a brief description
            of the issue. We will review your request within 3–5 business days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Contact</h2>
          <p>
            For billing questions or refund requests, email support@engestpro.com.
          </p>
        </section>
      </div>
    </div>
  )
}
