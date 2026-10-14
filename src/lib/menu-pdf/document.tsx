import "server-only";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CafeDetails, PublicMenu } from "@/lib/data/menu";
import { NUTRITION_NOTE } from "@/lib/cafe";
import type { MenuItem } from "@/lib/menu-types";
import { groupMenu, paginate, type PdfBlock } from "./layout";

// Figtree (OFL, see fonts/OFL.txt) – the site's body face; it has the ₹ sign, the PDF base fonts don't.
const fontDir = path.join(process.cwd(), "src/lib/menu-pdf/fonts");
Font.register({
  family: "Figtree",
  fonts: [
    { src: path.join(fontDir, "Figtree-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Figtree-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "Figtree-Bold.ttf"), fontWeight: 700 },
    { src: path.join(fontDir, "Figtree-ExtraBold.ttf"), fontWeight: 800 },
  ],
});
// Keep words whole (react-pdf hyphenates by default).
Font.registerHyphenationCallback((word) => [word]);

const LOGO = path.join(process.cwd(), "public/brand/hh-wordmark.png");

const C = {
  paper: "#FBF8EF",
  ink: "#1C2B22",
  muted: "#566B5D",
  green: "#15803D",
  deep: "#0F5C2C",
  band: "#E4F1E5",
  orange: "#C2410C",
  rule: "#B9D3BE",
};

const s = StyleSheet.create({
  page: { backgroundColor: C.paper, fontFamily: "Figtree", color: C.ink, padding: 18 },
  frame: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: C.green,
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  header: { alignItems: "center", marginBottom: 12 },
  logo: { width: 232, height: 58 },
  phone: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: 800,
    color: "#FFFFFF",
    backgroundColor: C.green,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
  },
  vegLine: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  vegBox: {
    width: 8,
    height: 8,
    borderWidth: 0.9,
    borderColor: C.green,
    borderRadius: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  vegDot: { width: 3.6, height: 3.6, borderRadius: 1.8, backgroundColor: C.green },
  vegText: { fontSize: 8, fontWeight: 600 },
  columns: { flexDirection: "row", flexGrow: 1 },
  column: { width: "50%" },
  colLeft: { paddingRight: 12, borderRightWidth: 0.6, borderRightColor: C.rule },
  colRight: { paddingLeft: 12 },
  block: { marginBottom: 12 },
  catBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.band,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  catName: { fontSize: 12, fontWeight: 800, color: C.deep, letterSpacing: 0.4, textTransform: "uppercase" },
  catContd: { fontSize: 7.5, fontWeight: 600, color: C.muted, marginLeft: 5 },
  catLine: { flexGrow: 1, height: 0.8, backgroundColor: C.green, marginLeft: 8, opacity: 0.6 },
  item: { marginBottom: 6 },
  nameRow: { flexDirection: "row", alignItems: "flex-end" },
  name: { fontSize: 9.5, fontWeight: 700, maxWidth: "78%" },
  leader: {
    flexGrow: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: C.rule,
    borderStyle: "dotted",
    marginHorizontal: 3,
    marginBottom: 2.5,
  },
  price: { fontSize: 9.5, fontWeight: 800, color: C.green },
  desc: { fontSize: 7.3, color: C.muted, marginTop: 1.5, lineHeight: 1.25 },
  nums: { flexDirection: "row", alignItems: "center", marginTop: 1.5, gap: 5 },
  nutri: { fontSize: 7.3, fontWeight: 700, color: C.orange },
  tag: {
    fontSize: 6,
    fontWeight: 800,
    color: C.ink,
    backgroundColor: "#FFD49A",
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  soldOut: {
    fontSize: 6,
    fontWeight: 800,
    color: "#FFFFFF",
    backgroundColor: C.muted,
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    textTransform: "uppercase",
  },
  addOns: {
    marginTop: 1,
    backgroundColor: C.band,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 7.3,
    lineHeight: 1.35,
  },
  addOnsLabel: { fontWeight: 800, color: C.deep },
  footer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.6,
    borderTopColor: C.rule,
    alignItems: "center",
    gap: 2,
  },
  note: { fontSize: 7, color: C.ink, textAlign: "center" },
  contact: { fontSize: 6.8, color: C.muted, textAlign: "center" },
  pageNo: { position: "absolute", right: 0, bottom: 0, fontSize: 6.5, color: C.muted },
});

// Owner-typed text may hold symbols Figtree lacks (they'd print as a wrong glyph): swap or drop them.
const SWAP: Record<string, string> = { "≈": "~", "★": "*", "☆": "*", "✓": "", "✔": "", "•": "·", "×": "x" };
const clean = (text: string) =>
  text
    .replace(/[≈★☆✓✔•×]/g, (ch) => SWAP[ch])
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, "")
    .replace(/ {2,}/g, " ")
    .trim();

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Item({ item }: { item: MenuItem }) {
  const hasNumbers = item.protein > 0 || item.kcal > 0;
  return (
    <View style={s.item} wrap={false}>
      <View style={s.nameRow}>
        <Text style={s.name}>{clean(item.name)}</Text>
        <View style={s.leader} />
        <Text style={s.price}>{item.price > 0 ? rupees(item.price) : "MRP"}</Text>
      </View>
      {item.description ? <Text style={s.desc}>{clean(item.description)}</Text> : null}
      {(hasNumbers || item.tags.includes("bestseller") || !item.available) && (
        <View style={s.nums}>
          {hasNumbers && (
            <Text style={s.nutri}>
              {[item.protein > 0 && `P ${item.protein}g`, item.kcal > 0 && `${item.kcal} kcal`]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
          {item.tags.includes("bestseller") && <Text style={s.tag}>Bestseller</Text>}
          {!item.available && <Text style={s.soldOut}>Sold out today</Text>}
        </View>
      )}
    </View>
  );
}

function Block({ block }: { block: PdfBlock }) {
  return (
    <View style={s.block}>
      <View style={s.catBar} wrap={false}>
        <Text style={s.catName}>{clean(block.name)}</Text>
        {block.continued && <Text style={s.catContd}>(continued)</Text>}
        <View style={s.catLine} />
      </View>
      {block.items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
      {block.showAddOns && block.addOns.length > 0 && (
        <Text style={s.addOns}>
          <Text style={s.addOnsLabel}>Add-ons: </Text>
          {block.addOns.map((a) => `${clean(a.name)} ${rupees(a.price)}`).join("  ·  ")}
        </Text>
      )}
    </View>
  );
}

export function MenuPdf({ menu, cafe, menuUrl }: { menu: PublicMenu; cafe: CafeDetails; menuUrl: string }) {
  const pages = paginate(groupMenu(menu.categories, menu.items, menu.addOns));
  const phone = cafe.phone.trim();
  const contact = [cafe.address, cafe.instagram && `@${cafe.instagram.replace(/^@/, "")}`]
    .filter(Boolean)
    .join("  ·  ");
  const updated = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <Document
      title={`${cafe.name} – Menu`}
      author={cafe.name}
      subject="Menu with protein and calories"
      language="en-IN"
    >
      {pages.map((columns, i) => (
        <Page key={i} size="A4" style={s.page}>
          <View style={s.frame}>
            <View style={s.header}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
              <Image src={LOGO} style={s.logo} />
              <View style={s.vegLine}>
                <View style={s.vegBox}>
                  <View style={s.vegDot} />
                </View>
                <Text style={s.vegText}>100% veg. Protein from real food.</Text>
              </View>
              {phone && <Text style={s.phone}>Call or WhatsApp: {phone}</Text>}
            </View>

            <View style={s.columns}>
              <View style={[s.column, s.colLeft]}>
                {columns[0].map((b, j) => (
                  <Block key={j} block={b} />
                ))}
              </View>
              <View style={[s.column, s.colRight]}>
                {columns[1].map((b, j) => (
                  <Block key={j} block={b} />
                ))}
              </View>
            </View>

            <View style={s.footer}>
              <Text style={s.note}>{NUTRITION_NOTE} Prices in ₹, inclusive of taxes.</Text>
              {contact && <Text style={s.contact}>{contact}</Text>}
              <Text style={s.contact}>
                Live menu & ordering: {menuUrl} · Updated {updated}
              </Text>
              {pages.length > 1 && (
                <Text style={s.pageNo}>
                  {i + 1} / {pages.length}
                </Text>
              )}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
