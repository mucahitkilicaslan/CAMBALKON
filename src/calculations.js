
const number = value => {
  const n = Number(String(value ?? '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function calculate(data) {
  const width = number(data.width);
  const height = number(data.height);
  const rawPanels = number(data.panels);

  const panels = Math.max(
    1,
    Math.min(100, Math.floor(rawPanels || 1))
  );

  // CAM ENI
  const usableWidth = width - 25;
  const panelWidth = usableWidth / panels;
  const netWidth = panelWidth - 0.6;

  // CAM BOYU
  const netHeight = height - 170;

  // ALUMINYUM PROFIL KESIMLERI
  const caseProfileLength = width;
  const glassProfileLength = panelWidth - 10;

  const upperCaseQty = 1;
  const lowerCaseQty = 1;
  const upperGlassQty = panels;
  const lowerGlassQty = panels;

  const caseTotalLength = Math.max(0, width) * 2;

  const glassTotalLength =
    Math.max(0, glassProfileLength) * panels * 2;

  const aluminumTotalLength =
    caseTotalLength + glassTotalLength;

  const aluminumTotalPieces = 2 + panels * 2;

  const valid =
    width > 25 &&
    height > 170 &&
    Number.isInteger(rawPanels) &&
    rawPanels >= 1 &&
    rawPanels <= 100 &&
    netWidth > 0 &&
    netHeight > 0 &&
    glassProfileLength > 0;

  // FIYAT HESABI
  const area = Math.max(0, width * height / 1000000);

  const price = Math.max(0, number(data.price));
  const installation = Math.max(0, number(data.installation));
  const transport = Math.max(0, number(data.transport));
  const other = Math.max(0, number(data.other));

  const discountRate = Math.min(
    100,
    Math.max(0, number(data.discount))
  );

  const vatRate = Math.max(0, number(data.vat));

  const material = area * price;

  const beforeDiscount =
    material + installation + transport + other;

  const discount =
    beforeDiscount * discountRate / 100;

  const subtotal = beforeDiscount - discount;
  const vat = subtotal * vatRate / 100;
  const total = subtotal + vat;

  return {
    width,
    height,
    panels,
    usableWidth,
    panelWidth,
    netWidth,
    netHeight,
    valid,
    area,
    material,
    discount,
    subtotal,
    vat,
    total,

    caseProfileLength,
    glassProfileLength,
    upperCaseQty,
    lowerCaseQty,
    upperGlassQty,
    lowerGlassQty,
    caseTotalLength,
    glassTotalLength,
    aluminumTotalLength,
    aluminumTotalPieces,
  };
}
