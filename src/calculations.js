const number = (value) => {
  const n = Number(String(value ?? '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function calculate(data) {
  const width = number(data.width);
  const height = number(data.height);

  const panels = Math.max(
    1,
    Math.min(100, Math.floor(number(data.panels) || 1))
  );

  // Cam eni otomatik hesaplama
  const usableWidth = width - 25;
  const panelWidth = usableWidth / panels;
  const netWidth = panelWidth - 0.6;

  // Cam boyu mevcut manuel hesaplama
  const profileH = number(data.profileH);
  const sealH = number(data.sealH);
  const gapH = number(data.gapH);

  const netHeight =
    height - profileH - sealH - gapH;

  const valid =
    width > 25 &&
    height > 0 &&
    number(data.panels) >= 1 &&
    Number.isInteger(number(data.panels)) &&
    number(data.panels) <= 100 &&
    [profileH, sealH, gapH].every(v => v >= 0) &&
    netWidth > 0 &&
    netHeight > 0;

  const area = Math.max(
    0,
    (width * height) / 1000000
  );

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
    (beforeDiscount * discountRate) / 100;

  const subtotal = beforeDiscount - discount;
  const vat = (subtotal * vatRate) / 100;
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
  };
}