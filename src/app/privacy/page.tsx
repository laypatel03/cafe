import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LogoIcon } from "@/components/brand/logo";
import { getCafeDetails } from "@/lib/data/menu";

export const metadata: Metadata = {
  title: "Privacy note",
  description: "What Healthy Hunger collects when you use the QR menu, why, and how to have it deleted.",
};

// Keep in step with what the app actually does (see Order, Customer, CafeSettings).
const UPDATED = "21 October 2026";

export default async function PrivacyPage() {
  await connection();
  const cafe = await getCafeDetails();
  const contact = [cafe.phone && `call ${cafe.phone}`, cafe.whatsapp && `WhatsApp +${cafe.whatsapp}`]
    .filter(Boolean)
    .join(" or ");

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> {cafe.name}
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <LogoIcon className="h-12" alt="" />
        <div>
          <h1 className="text-4xl font-bold">Privacy note</h1>
          <p className="text-sm text-muted-foreground">Last updated {UPDATED}</p>
        </div>
      </div>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        <p className="text-lg text-muted-foreground">
          {cafe.name} collects as little as possible. This note explains what we keep when you use our QR
          menu, why, and how to have it removed.
        </p>

        <section>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Your name and mobile number</strong>, when you place an order.
            </li>
            <li>
              <strong>Your order:</strong> the items, dine-in or takeaway, any note to the kitchen, and the
              bill.
            </li>
            <li>
              <strong>Your offers choice</strong> – only if you tick the box, with the date you ticked it.
            </li>
            <li>
              <strong>On your phone</strong>, the site remembers your list and your details so the next order
              is quicker. This stays in your browser.
            </li>
          </ul>
          {cafe.gaMeasurementId ? (
            <p className="mt-2">
              We don&apos;t ask for your email, we don&apos;t take payments online, and the site has no
              advertising cookies. We use Google Analytics to count visits and see which pages are used; it
              sets cookies and Google receives your IP address and device details. It never sees your name,
              phone number or order.
            </p>
          ) : (
            <p className="mt-2">
              We don&apos;t ask for your email, we don&apos;t take payments online, and the site has no
              advertising or tracking cookies.
            </p>
          )}
          {cafe.googlePlaceId && (
            <p className="mt-2">
              The home page shows our reviews from Google. The reviewers&apos; photos load from Google, so
              Google sees your IP address when you view them.
            </p>
          )}
        </section>

        <section>
          <h2>Why we use it</h2>
          <ul>
            <li>To prepare your order, call you when it&apos;s ready and make your bill.</li>
            <li>To contact you about that order if needed.</li>
            <li>To recognise you when you come back (number of visits).</li>
            <li>
              To send offers on WhatsApp or SMS – <strong>only</strong> if you ticked the box.
            </li>
          </ul>
        </section>

        <section>
          <h2>Who can see it</h2>
          <ul>
            <li>
              Café staff see your order and your name. They see your mobile number partly hidden (for example
              98xxxxxx21).
            </li>
            <li>The owner can see the full number and your past visits.</li>
            <li>We don&apos;t sell or share your details with anyone else.</li>
          </ul>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>Orders and bills are kept as the café&apos;s sales records.</li>
            <li>Your customer details (name, number, visits) are kept until you ask us to delete them.</li>
            <li>On your phone, your list clears itself after 12 hours, or when you tap “Clear list”.</li>
          </ul>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            Under India&apos;s Digital Personal Data Protection Act, 2023 you can ask what we hold about you,
            ask us to correct it, or ask us to delete it, and you can stop offers at any time.{" "}
            {contact ? <>To do that, {contact}, or </> : <>To do that, </>}
            speak to us at the counter.
          </p>
        </section>

        {cafe.address && (
          <section>
            <h2>Who we are</h2>
            <p>
              {cafe.name}
              <br />
              {cafe.address}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
