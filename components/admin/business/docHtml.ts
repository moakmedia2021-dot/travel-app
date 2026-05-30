import type { BusinessDocument, InvoiceLineItem } from "@/lib/business/types";

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function money(v: number | null | undefined, currency = "USD"): string {
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

const SHELL = (title: string, inner: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #171717; margin: 0; padding: 48px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: -0.5px; }
  .muted { color: #737373; font-size: 13px; }
  .grid { display: flex; gap: 48px; margin-bottom: 28px; }
  .grid h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #a3a3a3; margin: 0 0 6px; }
  .grid p { margin: 1px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #a3a3a3; border-bottom: 1px solid #e5e5e5; padding: 8px 0; }
  td { padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  td.r, th.r { text-align: right; }
  .total { display: flex; justify-content: flex-end; gap: 40px; margin-top: 12px; font-size: 16px; font-weight: 700; }
  .body { white-space: pre-wrap; font-size: 14px; line-height: 1.6; margin-top: 8px; }
  .badge { display:inline-block; background:#171717; color:#fff; font-size:11px; font-weight:700; padding:4px 10px; border-radius:6px; }
  .blue { color: #2563eb; }
  .foot { margin-top: 40px; font-size: 12px; color: #a3a3a3; }
  @media print { body { padding: 0; } }
</style></head>
<body><div class="wrap">${inner}</div></body></html>`;

function partyBlock(label: string, p?: { name?: string; business?: string; email?: string; property?: string; location?: string }) {
  if (!p) return "";
  return `<div><h3>${label}</h3>
    ${p.name ? `<p><strong>${esc(p.name)}</strong></p>` : ""}
    ${p.business ? `<p>${esc(p.business)}</p>` : ""}
    ${p.property ? `<p>${esc(p.property)}</p>` : ""}
    ${p.location ? `<p>${esc(p.location)}</p>` : ""}
    ${p.email ? `<p class="muted">${esc(p.email)}</p>` : ""}</div>`;
}

export function buildDocHtml(d: BusinessDocument): string {
  const c = d.content;
  const currency = c.currency || "USD";
  const logo = `<div><span class="badge">Get<span class="blue">Goin</span></span></div>`;

  if (d.type === "invoice") {
    const items: InvoiceLineItem[] = c.line_items ?? [];
    const total = items.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.rate) || 0), 0);
    const rows = items
      .map(
        (li) => `<tr>
        <td>${esc(li.description)}</td>
        <td class="r">${Number(li.quantity) || 0}</td>
        <td class="r">${money(li.rate, currency)}</td>
        <td class="r">${money((Number(li.quantity) || 0) * (Number(li.rate) || 0), currency)}</td>
      </tr>`
      )
      .join("");
    const inner = `
      <div class="head">
        <div><h1>Invoice</h1><p class="muted">${esc(d.number ?? "")}</p></div>
        ${logo}
      </div>
      <div class="grid">
        ${partyBlock("From", c.from)}
        ${partyBlock("Bill to", c.to)}
        <div><h3>Details</h3>
          ${c.issued_on ? `<p>Issued: ${esc(c.issued_on)}</p>` : ""}
          ${c.due_on ? `<p>Due: ${esc(c.due_on)}</p>` : ""}
        </div>
      </div>
      <table>
        <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total"><span>Total</span><span>${money(total, currency)}</span></div>
      ${c.notes ? `<div class="body"><h3 style="font-size:11px;text-transform:uppercase;color:#a3a3a3;">Notes</h3>${esc(c.notes)}</div>` : ""}
      <div class="foot">Generated with GetGoin Business</div>`;
    return SHELL(`${d.number ?? "Invoice"}`, inner);
  }

  // contract
  const inner = `
    <div class="head">
      <div><h1>${esc(d.title)}</h1>${c.effective_date ? `<p class="muted">Effective ${esc(c.effective_date)}</p>` : ""}</div>
      ${logo}
    </div>
    <div class="grid">
      ${partyBlock("Creator", c.from)}
      ${partyBlock("Host", c.to)}
    </div>
    <div class="body">${esc(c.body)}</div>
    <div style="display:flex; gap:64px; margin-top:56px;">
      <div style="flex:1;"><div style="border-top:1px solid #171717; padding-top:6px;" class="muted">Creator signature & date</div></div>
      <div style="flex:1;"><div style="border-top:1px solid #171717; padding-top:6px;" class="muted">Host signature & date</div></div>
    </div>
    <div class="foot">Generated with GetGoin Business · This is a template and not legal advice.</div>`;
  return SHELL(d.title, inner);
}
