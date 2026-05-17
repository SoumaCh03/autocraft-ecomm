import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const formatCurrency = (value) => `Rs.${Number(value || 0).toLocaleString('en-IN')}`

export const downloadInvoice = (order, toast) => {
  const doc = new jsPDF()
  const invoiceNumber = order.invoiceNumber || `AC-${new Date(order.createdAt).getFullYear()}-${order._id.slice(-8).toUpperCase()}`

  doc.setFillColor(8, 12, 20)
  doc.rect(0, 0, 210, 42, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('AUTOCRAFT', 14, 19)
  doc.setFontSize(9)
  doc.setTextColor(190, 199, 218)
  doc.text('Premium Car Accessories | GST Style Tax Invoice', 14, 27)
  doc.text('Old Military Hospital Road, Gowala Patti, Cooch Behar, WB 736101', 14, 33)

  doc.setTextColor(59, 107, 255)
  doc.setFontSize(18)
  doc.text('INVOICE', 160, 18)
  doc.setFontSize(9)
  doc.setTextColor(210, 218, 235)
  doc.text(`Invoice No: ${invoiceNumber}`, 132, 27)
  doc.text(`Order ID: ${order._id}`, 132, 33)
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 132, 39)

  doc.setDrawColor(59, 107, 255)
  doc.line(14, 48, 196, 48)

  doc.setFontSize(11)
  doc.setTextColor(10, 15, 28)
  doc.text('Bill To / Ship To', 14, 58)
  doc.setFontSize(9)
  doc.setTextColor(70)
  doc.text(order.shippingAddress.name, 14, 65)
  doc.text(order.shippingAddress.street, 14, 71)
  doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`, 14, 77)
  doc.text(`Phone: ${order.shippingAddress.phone}`, 14, 83)

  doc.setFontSize(11)
  doc.setTextColor(10, 15, 28)
  doc.text('Payment & Order', 128, 58)
  doc.setFontSize(9)
  doc.setTextColor(70)
  doc.text(`Method: ${String(order.paymentMethod || '').toUpperCase()}`, 128, 65)
  doc.text(`Payment: ${order.isPaid ? 'PAID' : 'UNPAID'}`, 128, 71)
  doc.text(`Status: ${String(order.status || '').toUpperCase()}`, 128, 77)
  if (order.paymentResult?.razorpay_payment_id) {
    doc.text(`Txn: ${order.paymentResult.razorpay_payment_id}`, 128, 83)
  }

  autoTable(doc, {
    startY: 94,
    head: [['#', 'Product', 'Qty', 'Rate', 'GST', 'Amount']],
    body: order.items.map((item, index) => [
      index + 1,
      item.name,
      item.qty,
      formatCurrency(item.price),
      'Incl.',
      formatCurrency(Number(item.price || 0) * Number(item.qty || 0)),
    ]),
    headStyles: { fillColor: [59, 107, 255], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [246, 248, 252] },
  })

  const y = doc.lastAutoTable.finalY + 8
  const rows = [
    ['Subtotal', formatCurrency(order.itemsPrice)],
    ['Discount', Number(order.discountPrice || 0) > 0 ? `-${formatCurrency(order.discountPrice)}` : formatCurrency(0)],
    ['Shipping', Number(order.shippingPrice || 0) === 0 ? 'FREE' : formatCurrency(order.shippingPrice)],
    ['Total', formatCurrency(order.totalPrice)],
  ]

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    margin: { left: 122 },
    body: rows,
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { textColor: [92, 101, 121] },
      1: { halign: 'right', fontStyle: 'bold', textColor: [8, 12, 20] },
    },
  })

  const finalY = doc.lastAutoTable.finalY + 12
  doc.setTextColor(100)
  doc.setFontSize(8)
  doc.text('This is a computer generated GST-style invoice for AUTOCRAFT ecommerce order records.', 14, finalY)
  doc.text('Thank you for shopping with AUTOCRAFT.', 14, finalY + 5)

  doc.save(`AUTOCRAFT-Invoice-${invoiceNumber}.pdf`)
  toast?.success?.('Invoice downloaded')
}
