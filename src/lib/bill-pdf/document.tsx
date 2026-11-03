import "server-only";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PaymentMethod } from "@/generated/prisma/enums";
import type { BillLine } from "@/lib/billing";
import type { StatementGroup } from "@/lib/dues-statement";
import { CAFE_CONTACT_NUMBER } from "@/lib/cafe";
import { CAFE_TZ, formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payments";
import { PDF_FONT } from "@/lib/pdf-fonts";

// The bill and the dues statement as PDFs, sent on WhatsApp. A5 – reads well on a phone, prints on A4.

const LOGO = path.join(process.cwd(), "public/brand/hh-wordmark.png");

const C = {
  ink: "#1C2B22",
  muted: "#566B5D",
  green: "#167A24",
  band: "#EAF4E0",
  orange: "#B85400",
  rule: "#BFD8AE",
};

const s = StyleSheet.create({
  page: { fontFamily: PDF_FONT, color: C.ink, fontSize: 9, paddingVertical: 24, paddingHorizontal: 26 },
  header: { alignItems: "center", marginBottom: 10 },
  logo: { width: 170, height: 42 },
  small: { fontSize: 8, color: C.muted, textAlign: "center" },
  title: { fontSize: 13, fontWeight: 800, marginTop: 6, textAlign: "center" },
  rule: { borderBottomWidth: 0.7, borderBottomColor: C.rule, marginVertical: 8 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { color: C.muted },
  bold: { fontWeight: 700 },
  head: {
    flexDirection: "row",
    backgroundColor: C.band,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  row: { flexDirection: "row", paddingVertical: 2.5, paddingHorizontal: 4 },
  item: { flex: 1, paddingRight: 4 },
  addOns: { fontSize: 7.5, color: C.muted },
  qty: { width: 26, textAlign: "right" },
  rate: { width: 44, textAlign: "right" },
  amt: { width: 52, textAlign: "right" },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 12,
    fontWeight: 800,
    marginTop: 2,
  },
  status: { marginTop: 10, padding: 6, borderRadius: 4, textAlign: "center", fontWeight: 800, fontSize: 10 },
  group: { marginTop: 8 },
  groupHead: { flexDirection: "row", justifyContent: "space-between", fontWeight: 700, marginBottom: 2 },
  footer: { marginTop: 14, textAlign: "center", color: C.muted, fontSize: 8 },
  contact: { marginTop: 4, textAlign: "center", fontSize: 9, fontWeight: 700 },
});

const rupees = (paise: number) => formatINR(toRupees(paise));
const dateTime = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: CAFE_TZ, dateStyle: "medium", timeStyle: "short" });
const dateOnly = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: CAFE_TZ, dateStyle: "medium" });

export type PdfCafe = { name: string; tagline: string; address: string; phone: string };

function Header({ cafe, title }: { cafe: PdfCafe; title: string }) {
  return (
    <View style={s.header}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an <img> */}
      <Image src={LOGO} style={s.logo} />
      {cafe.address && <Text style={s.small}>{cafe.address}</Text>}
      {cafe.phone && <Text style={s.small}>Ph: {cafe.phone}</Text>}
      <Text style={s.title}>{title}</Text>
    </View>
  );
}

function Lines({ lines }: { lines: BillLine[] }) {
  return (
    <View>
      <View style={s.head}>
        <Text style={s.item}>Item</Text>
        <Text style={s.qty}>Qty</Text>
        <Text style={s.rate}>Rate</Text>
        <Text style={s.amt}>Amount</Text>
      </View>
      {lines.map((l, i) => (
        <View key={i} style={s.row} wrap={false}>
          <View style={s.item}>
            <Text>{l.name}</Text>
            {l.addOns.length > 0 && <Text style={s.addOns}>+ {l.addOns.join(", ")}</Text>}
          </View>
          <Text style={s.qty}>{l.quantity}</Text>
          <Text style={s.rate}>{toRupees(l.unitPricePaise)}</Text>
          <Text style={s.amt}>{toRupees(l.amountPaise)}</Text>
        </View>
      ))}
    </View>
  );
}

function Meta({ rows }: { rows: [string, string][] }) {
  return rows.map(([k, v]) => (
    <View key={k} style={s.meta}>
      <Text style={s.label}>{k}</Text>
      <Text style={s.bold}>{v}</Text>
    </View>
  ));
}

export type BillDoc = {
  cafe: PdfCafe;
  number: number;
  createdAt: Date;
  type: "DINE_IN" | "PARCEL";
  guestName: string;
  orderNumbers: number[];
  lines: BillLine[];
  subtotalPaise: number;
  taxBasisPoints: number;
  taxPaise: number;
  totalPaise: number;
  status:
    { kind: "PAID"; method: PaymentMethod | null; at: Date } | { kind: "PAY_LATER" } | { kind: "UNPAID" };
};

export function BillPdf({ bill }: { bill: BillDoc }) {
  const status =
    bill.status.kind === "PAID"
      ? {
          text: `PAID${bill.status.method ? ` · ${PAYMENT_LABEL[bill.status.method]}` : ""} · ${dateTime(bill.status.at)}`,
          color: C.green,
        }
      : bill.status.kind === "PAY_LATER"
        ? { text: "PAY LATER · added to your dues", color: C.orange }
        : { text: "Please pay at the counter", color: C.orange };
  return (
    <Document title={`${bill.cafe.name} – Bill #${bill.number}`} author={bill.cafe.name}>
      <Page size="A5" style={s.page}>
        <Header cafe={bill.cafe} title={`Bill #${bill.number}`} />
        <Meta
          rows={[
            ["Date", dateTime(bill.createdAt)],
            ["Guest", bill.guestName],
            ["Order", bill.type === "PARCEL" ? "Takeaway" : "Dine-in"],
            ["Orders", bill.orderNumbers.map((n) => `#${n}`).join(", ")],
          ]}
        />
        <View style={s.rule} />
        <Lines lines={bill.lines} />
        <View style={s.rule} />
        <Meta
          rows={[
            ["Subtotal", rupees(bill.subtotalPaise)],
            ...(bill.taxPaise > 0
              ? ([[`Tax (${bill.taxBasisPoints / 100}%)`, rupees(bill.taxPaise)]] as [string, string][])
              : []),
          ]}
        />
        <View style={s.total}>
          <Text>Total</Text>
          <Text>{rupees(bill.totalPaise)}</Text>
        </View>
        <Text style={[s.status, { color: status.color, borderWidth: 1, borderColor: status.color }]}>
          {status.text}
        </Text>
        <Text style={s.footer}>Thank you! {bill.cafe.tagline}</Text>
        <Text style={s.contact}>WhatsApp / call: {CAFE_CONTACT_NUMBER}</Text>
      </Page>
    </Document>
  );
}

export type ReceiptDoc = {
  cafe: PdfCafe;
  guestName: string;
  paidAt: Date;
  method: PaymentMethod | null;
  groups: StatementGroup[];
  receivedPaise: number;
  stillDuePaise: number;
};

/** Pay-later bills paid off together: what was paid, how, and what's still due. */
export function PaymentReceiptPdf({ doc }: { doc: ReceiptDoc }) {
  return (
    <Document title={`${doc.cafe.name} – payment received`} author={doc.cafe.name}>
      <Page size="A5" style={s.page}>
        <Header cafe={doc.cafe} title="Payment received" />
        <Meta
          rows={[
            ["Guest", doc.guestName],
            ["Date", dateTime(doc.paidAt)],
            ...(doc.method ? ([["Paid by", PAYMENT_LABEL[doc.method]]] as [string, string][]) : []),
          ]}
        />
        <View style={s.rule} />
        {doc.groups.map((g) => (
          <View key={g.label} style={s.group}>
            <View style={s.groupHead} wrap={false}>
              <Text>
                {g.label} · {dateOnly(g.date)}
              </Text>
              <Text>{rupees(g.amountPaise)}</Text>
            </View>
            <Lines lines={g.lines} />
          </View>
        ))}
        <View style={s.rule} />
        <View style={s.total}>
          <Text>Received</Text>
          <Text style={{ color: C.green }}>{rupees(doc.receivedPaise)}</Text>
        </View>
        <Text
          style={[
            s.status,
            doc.stillDuePaise > 0
              ? { color: C.orange, borderWidth: 1, borderColor: C.orange }
              : { color: C.green, borderWidth: 1, borderColor: C.green },
          ]}
        >
          {doc.stillDuePaise > 0
            ? `Still to pay: ${rupees(doc.stillDuePaise)}`
            : "All paid up – nothing left to pay"}
        </Text>
        <Text style={s.footer}>Thank you! {doc.cafe.tagline}</Text>
        <Text style={s.contact}>WhatsApp / call: {CAFE_CONTACT_NUMBER}</Text>
      </Page>
    </Document>
  );
}

export type StatementDoc = {
  cafe: PdfCafe;
  guestName: string;
  asOf: Date;
  groups: StatementGroup[];
  totalPaise: number;
};

export function DuesStatementPdf({ doc }: { doc: StatementDoc }) {
  return (
    <Document title={`${doc.cafe.name} – still to pay`} author={doc.cafe.name}>
      <Page size="A5" style={s.page}>
        <Header cafe={doc.cafe} title="Still to pay" />
        <Meta
          rows={[
            ["Guest", doc.guestName],
            ["As of", dateOnly(doc.asOf)],
          ]}
        />
        <View style={s.total}>
          <Text>Total due</Text>
          <Text style={{ color: C.orange }}>{rupees(doc.totalPaise)}</Text>
        </View>
        <View style={s.rule} />
        {doc.groups.map((g) => (
          <View key={g.label} style={s.group}>
            <View style={s.groupHead} wrap={false}>
              <Text>
                {g.label} · {dateOnly(g.date)}
                {g.label.startsWith("Bill") && ` · orders ${g.orderNumbers.map((n) => `#${n}`).join(", ")}`}
              </Text>
              <Text>{rupees(g.amountPaise)}</Text>
            </View>
            <Lines lines={g.lines} />
          </View>
        ))}
        <View style={s.rule} />
        <View style={s.total}>
          <Text>Total due</Text>
          <Text>{rupees(doc.totalPaise)}</Text>
        </View>
        <Text style={s.footer}>You can pay at the counter on your next visit. Thank you!</Text>
        <Text style={s.contact}>Questions? WhatsApp / call: {CAFE_CONTACT_NUMBER}</Text>
      </Page>
    </Document>
  );
}
