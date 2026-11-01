import { AFRelationship, PDFDocument, PDFName, PDFString } from 'pdf-lib';

/**
 * Factur-X (norme franco-allemande EN 16931) — profil BASIC WL, commun aux
 * logiciels OptiGroup : le PDF lisible + le fichier XML « factur-x.xml » (CII)
 * joint dedans, que lisent les plateformes de facturation électronique.
 * Avoir : type 381, montants en positif, référence à la facture d'origine.
 * Fichier partagé (bridge/shared/invoices).
 *
 * Limite : le PDF produit par le navigateur n'est pas certifié PDF/A-3 (polices
 * standard non incorporées). La plupart des plateformes acceptent aussi le XML
 * seul. À valider avec la plateforme choisie.
 */
export interface FacturXParty {
  companyName: string;
  siren?: string;
  siret?: string;
  vatNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  email?: string;
}
export interface FacturXDoc {
  number: string;
  issueDate: string;
  dueDate?: string;
  /** Date de la prestation (livraison / fin de période). */
  deliveryDate?: string;
  /** Avoir : numéro de la facture d'origine. */
  creditOf?: string;
  seller: FacturXParty;
  buyer: FacturXParty;
  /** Montants de la pièce (négatifs pour un avoir : ils sont remis en positif). */
  ht: number;
  tva: number;
  ttc: number;
  /** Taux de TVA (%) */
  rate: number;
  notes: string[];
  paymentTermsDays?: number;
  paid: boolean;
  /** Logiciel émetteur (OptiFlow, OptiFret, OptiXpress). */
  creator: string;
}

const x = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
const amt = (n: number) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const d102 = (iso?: string) => (iso ? iso.slice(0, 10).replace(/-/g, '') : '');
// Uint8Array du contexte courant (évite les soucis de « realm » de TextEncoder)
const utf8 = (s: string) => Uint8Array.from(new TextEncoder().encode(s));
const digits = (s?: string) => (s || '').replace(/\D/g, '');

function party(tag: string, p: { companyName: string; siren?: string; siret?: string; vatNumber?: string; address?: string; postalCode?: string; city?: string; email?: string }) {
  const siren = digits(p.siret).slice(0, 9) || digits(p.siren);
  return `<ram:${tag}>
      <ram:Name>${x(p.companyName)}</ram:Name>
      ${siren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${siren}</ram:ID></ram:SpecifiedLegalOrganization>` : ''}
      <ram:PostalTradeAddress>
        ${p.postalCode ? `<ram:PostcodeCode>${x(p.postalCode)}</ram:PostcodeCode>` : ''}
        ${p.address ? `<ram:LineOne>${x(p.address)}</ram:LineOne>` : ''}
        ${p.city ? `<ram:CityName>${x(p.city)}</ram:CityName>` : ''}
        <ram:CountryID>FR</ram:CountryID>
      </ram:PostalTradeAddress>
      ${p.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${x(p.email)}</ram:URIID></ram:URIUniversalCommunication>` : ''}
      ${p.vatNumber ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${x(p.vatNumber.replace(/\s/g, ''))}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
    </ram:${tag}>`;
}

export function facturXml(d: FacturXDoc): string {
  const sign = d.creditOf ? -1 : 1;
  const ht = sign * (Number(d.ht) || 0);
  const tva = sign * (Number(d.tva) || 0);
  const ttc = sign * (Number(d.ttc) || 0) || ht + tva;
  const rate = Math.abs(Number(d.rate) || 0);
  const notes = [
    ...(d.creditOf ? [`Avoir sur la facture ${d.creditOf}.`] : []),
    ...d.notes,
    'Catégorie d\'opération : prestation de services.',
    'Pénalités de retard au taux légal ; indemnité forfaitaire pour frais de recouvrement : 40 EUR (art. L441-10 du Code de commerce).',
  ].filter(Boolean);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:factur-x.eu:1p0:basicwl</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${x(d.number)}</ram:ID>
    <ram:TypeCode>${d.creditOf ? '381' : '380'}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${d102(d.issueDate)}</udt:DateTimeString></ram:IssueDateTime>
    ${notes.map((n) => `<ram:IncludedNote><ram:Content>${x(n)}</ram:Content></ram:IncludedNote>`).join('\n    ')}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
    ${party('SellerTradeParty', d.seller)}
    ${party('BuyerTradeParty', d.buyer)}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      ${d.deliveryDate ? `<ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${d102(d.deliveryDate)}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>` : ''}
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${amt(tva)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${amt(ht)}</ram:BasisAmount>
        <ram:CategoryCode>${rate > 0 ? 'S' : 'E'}</ram:CategoryCode>
        ${rate > 0 ? '' : '<ram:ExemptionReason>Exonération de TVA</ram:ExemptionReason>'}
        <ram:DueDateTypeCode>72</ram:DueDateTypeCode>
        <ram:RateApplicablePercent>${amt(rate)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Paiement à ${d.paymentTermsDays ?? 30} jours</ram:Description>
        ${d.dueDate ? `<ram:DueDateDateTime><udt:DateTimeString format="102">${d102(d.dueDate)}</udt:DateTimeString></ram:DueDateDateTime>` : ''}
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${amt(ht)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${amt(ht)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${amt(tva)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${amt(ttc)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${amt(d.paid || d.creditOf ? 0 : ttc)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      ${d.creditOf ? `<ram:InvoiceReferencedDocument><ram:IssuerAssignedID>${x(d.creditOf)}</ram:IssuerAssignedID></ram:InvoiceReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}

function xmp(d: FacturXDoc) {
  const now = new Date().toISOString();
  // L'en-tête XMP impose le caractère BOM (U+FEFF) dans begin="…".
  // eslint-disable-next-line no-irregular-whitespace
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"><pdfaid:part>3</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance></rdf:Description>
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${d.creditOf ? 'Avoir' : 'Facture'} ${x(d.number)}</rdf:li></rdf:Alt></dc:title><dc:creator><rdf:Seq><rdf:li>${x(d.seller.companyName)}</rdf:li></rdf:Seq></dc:creator></rdf:Description>
  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><xmp:CreatorTool>${x(d.creator)}</xmp:CreatorTool><xmp:CreateDate>${now}</xmp:CreateDate><xmp:ModifyDate>${now}</xmp:ModifyDate></rdf:Description>
  <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
   <pdfaExtension:schemas><rdf:Bag><rdf:li rdf:parseType="Resource">
    <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
    <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
    <pdfaSchema:prefix>fx</pdfaSchema:prefix>
    <pdfaSchema:property><rdf:Seq>
     <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentFileName</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>name of the embedded XML invoice file</pdfaProperty:description></rdf:li>
     <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentType</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>INVOICE</pdfaProperty:description></rdf:li>
     <rdf:li rdf:parseType="Resource"><pdfaProperty:name>Version</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>version of the standard</pdfaProperty:description></rdf:li>
     <rdf:li rdf:parseType="Resource"><pdfaProperty:name>ConformanceLevel</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>profile of the standard</pdfaProperty:description></rdf:li>
    </rdf:Seq></pdfaSchema:property>
   </rdf:li></rdf:Bag></pdfaExtension:schemas>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#"><fx:DocumentType>INVOICE</fx:DocumentType><fx:DocumentFileName>factur-x.xml</fx:DocumentFileName><fx:Version>1.0</fx:Version><fx:ConformanceLevel>BASIC WL</fx:ConformanceLevel></rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/** Ajoute le XML Factur-X et ses métadonnées dans le PDF de la facture. */
export async function toFacturX(pdfBytes: ArrayBuffer | Uint8Array, d: FacturXDoc): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes instanceof Uint8Array ? Uint8Array.from(pdfBytes) : new Uint8Array(pdfBytes));
  await doc.attach(utf8(facturXml(d)), 'factur-x.xml', {
    mimeType: 'text/xml',
    description: 'Factur-X',
    creationDate: new Date(),
    modificationDate: new Date(),
    afRelationship: AFRelationship.Data,
  });
  doc.setTitle(`${d.creditOf ? 'Avoir' : 'Facture'} ${d.number}`);
  doc.setAuthor(d.seller.companyName);
  doc.setCreator(d.creator);
  doc.setProducer(d.creator);
  const meta = doc.context.stream(utf8(xmp(d)), { Type: 'Metadata', Subtype: 'XML' });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(meta));
  doc.catalog.set(PDFName.of('Lang'), PDFString.of('fr-FR'));
  return doc.save({ useObjectStreams: false });
}

export function downloadBytes(bytes: Uint8Array | string, filename: string, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
