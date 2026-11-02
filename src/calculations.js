const number = (value) => {
  const n = Number(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export function calculate(data) {
  const width = number(data.width);
  const height = number(data.height);
  const panels = Math.max(1, Math.floor(number(data.panels) || 1));

  const panelWidth = width / panels;

  const netWidth = Math.max(
    0,
    panelWidth - number(data.profileW) - number(data.sealW) - number(data.gapW)
  );

  const netHeight = Math.max(
    0,
    height - number(data.profileH) - number(data.sealH) - number(data.gapH)
  );

  const valid = width > 0 && height > 0 &&
    netWidth > 0 && netHeight > 0;

  const area = (width * height) / 1000000;
  const material = area * number(data.price);
  const discount = material * number(data.discount) / 100;
  const subtotal = material - discount +
    number(data.installation) +
    number(data.transport) +
    number(data.other);

  const vat = subtotal * number(data.vat) / 100;
  const total = subtotal + vat;

  return {
    width, height, panels, panelWidth,
    netWidth, netHeight, valid, area,
    material, discount, subtotal, vat, total
  };
}
