import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";

/**
 * A refund and cancellation policy is not optional decoration: Razorpay,
 * Cashfree and every other Indian gateway check for one during KYC, and
 * reject sites that don't have it. It also settles disputes before they
 * start.
 *
 * NOTE FOR THE SITE OWNER: the specific windows and percentages below are
 * a conventional starting point, NOT legal advice, and they are a
 * commercial commitment to whoever reads them. Read every line and change
 * the numbers to what you will actually honour before pointing anyone at
 * this page.
 */
const RefundPolicyPage = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Refund & Cancellation Policy"
      description="Refund and cancellation terms for paid programmes and services from Karn HR Academy."
      path="/refund-policy"
    />
    <Header />
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold text-foreground">Refund &amp; Cancellation Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This policy applies to paid programmes and services booked through Karn HR Academy.
        Free notes, MCQs, previous year papers and lectures on this site involve no payment
        and are not covered by it.
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">Cancelling a programme booking</h2>
          <ul className="space-y-2">
            <li>
              <strong className="text-foreground">7 or more days before the batch starts:</strong>{" "}
              full refund of the amount paid.
            </li>
            <li>
              <strong className="text-foreground">Less than 7 days before the batch starts:</strong>{" "}
              50% of the amount paid is refunded, as the seat can no longer be reallocated.
            </li>
            <li>
              <strong className="text-foreground">On or after the start date:</strong> no refund,
              since sessions and materials have been delivered.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">If we cancel or reschedule</h2>
          <p>
            If a batch is cancelled, or rescheduled to dates you cannot attend, you may choose
            either a full refund or a transfer to a later batch at no extra cost. We will
            contact you directly if this happens.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">Duplicate or failed payments</h2>
          <p>
            If you are charged twice, or a payment leaves your account but your seat is not
            confirmed, write to us with your UPI reference number and we will refund the
            amount in full. Please allow 5–7 working days for the refund to reach your account
            after we approve it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">Seat confirmation</h2>
          <p>
            Payments are currently verified manually against our bank records. Submitting a
            registration reserves your place provisionally; your seat is confirmed only once
            we have matched the payment, normally within 24 hours. If we cannot match a
            payment, we will contact you before cancelling the registration.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">Digital materials</h2>
          <p>
            Paid digital materials, once downloaded or accessed, are not refundable. This does
            not affect your rights where material is faulty or materially different from what
            was described.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">How to request a refund</h2>
          <p>
            Email{" "}
            <a href="mailto:contact@karnhracademy.com" className="font-semibold text-accent-deep hover:underline">
              contact@karnhracademy.com
            </a>{" "}
            with your name, the programme and batch, and your UPI reference number. We aim to
            respond within 2 working days. You can also reach us through the{" "}
            <Link to="/contact" className="font-semibold text-accent-deep hover:underline">contact page</Link>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-foreground">Placement and outcomes</h2>
          <p>
            Our programmes provide preparation, coaching and support. We do not guarantee
            admission, selection, employment or any specific examination result, and fees are
            not refundable on the basis of an outcome not being achieved.
          </p>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default RefundPolicyPage;
