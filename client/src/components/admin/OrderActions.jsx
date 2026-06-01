import { Printer, Upload, Download } from 'lucide-react'
import { downloadInvoice } from '../../utils/invoice'

export default function OrderActions({ order, downloadShippingPDF, handleBillUpload, uploading, fileInputRef, toast }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => downloadShippingPDF(order)} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 rounded-lg transition-all">
        <Printer size={13} /> Shipping Label
      </button>

      <div>
        <input
          type="file"
          accept=".pdf,image/*"
          ref={el => fileInputRef.current[order._id] = el}
          onChange={e => handleBillUpload(order._id, e.target.files[0])}
          className="hidden"
        />
        <button onClick={() => fileInputRef.current[order._id]?.click()} disabled={uploading === order._id} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-accent-400/10 text-accent-400 hover:bg-accent-400/20 rounded-lg transition-all">
          {uploading === order._id
            ? <div className="w-3 h-3 border border-accent-400 border-t-transparent rounded-full animate-spin" />
            : <Upload size={13} />
          }
          {order.billUrl ? 'Update Bill' : 'Upload Bill'}
        </button>
      </div>

      {order.billUrl && (
        <a href={order.billUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-all">
          <Download size={13} /> View Bill
        </a>
      )}

      <button onClick={() => downloadInvoice(order, toast)} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-all">
        <Download size={13} /> Download Invoice
      </button>
    </div>
  )
}
