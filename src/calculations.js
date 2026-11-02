
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

  // OTOMATIK CAM ENI
  // Toplam genislikten 25 mm dusulur.
  // Panel adedine bolunur.
  // Her panelden 0.6 mm dusulur.
  const usableWidth = width - 25;
  const panelWidth = usableWidth / panels;
  const netWidth = panelWidth - 0.6;

  // OTOMATIK CAM BOYU
  // Toplam yukseklikten 170 mm dusulur.
  const netHeight = height - 170;

  const valid =
    width > 25 &&
    height > 170 &&
    Number.isInteger(rawPanels) &&
    rawPanels >= 1 &&
    rawPanels <= 100 &&
    netWidth > 0 &&
    netHeight > 0;

  // FIYAT HESAPLAMA
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
