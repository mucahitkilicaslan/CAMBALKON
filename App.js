const number = (value) => {
  const n = Number(String(value ?? '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function calculate(data) {
  const width = number(data.width);
  const height = number(data.height);
  const panels = Math.max(1, Math.min(100, Math.floor(number(data.panels) || 1)));

  const profileW = number(data.profileW);
  const sealW = number(data.sealW);
  const gapW = number(data.gapW);

  const profileH = number(data.profileH);
  const sealH = number(data.sealH);
  const gapH = number(data.gapH);

  const panelWidth = width / panels;

  const netWidth = panelWidth - profileW - sealW - gapW;
  const netHeight = height - profileH - sealH - gapH;

  const valid =
    width > 0 &&
    height > 0 &&
    number(data.panels) >= 1 &&
    Number.isInteger(number(data.panels)) &&
    number(data.panels) <= 100 &&
    [profileW, sealW, gapW, profileH, sealH, gapH].every(v => v >= 0) &&
    netWidth > 0 &&
    netHeight > 0;

  const area = Math.max(0, width * height / 1000000);

  const price = Math.max(0, number(data.price));
  const installation = Math.max(0, number(data.installation));
  const transport = Math.max(0, number(data.transport));
  const other = Math.max(0, number(data.other));

  const discountRate = Math.min(100, Math.max(0, number(data.discount)));
  const vatRate = Math.max(0, number(data.vat));

  const material = area * price;
  const beforeDiscount = material + installation + transport + other;
  const discount = beforeDiscount * discountRate / 100;
  const subtotal = beforeDiscount - discount;
  const vat = subtotal * vatRate / 100;
  const total = subtotal + vat;

  return {
    width,
    height,
    panels,
    panelWidth,
    netWidth,
    netHeight,
    valid,
    area,
    material,
    discount,
    subtotal,
    vat,
    total
  };
}
