import OrderCard from './OrderCard'

export default function OrderList({ orders, loading, updateStatus, setPaymentStatus, trackingForms, handleTrackingChange, saveTracking, trackingSaving, returnNotes, setReturnNotes, updateReturnStatus, returnUpdating, downloadShippingPDF, handleBillUpload, uploading, fileInputRef, toast }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-dark-muted">No orders yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order._id}
          order={order}
          updateStatus={updateStatus}
          setPaymentStatus={setPaymentStatus}
          trackingForms={trackingForms}
          handleTrackingChange={handleTrackingChange}
          saveTracking={saveTracking}
          trackingSaving={trackingSaving}
          returnNotes={returnNotes}
          setReturnNotes={setReturnNotes}
          updateReturnStatus={updateReturnStatus}
          returnUpdating={returnUpdating}
          downloadShippingPDF={downloadShippingPDF}
          handleBillUpload={handleBillUpload}
          uploading={uploading}
          fileInputRef={fileInputRef}
          toast={toast}
        />
      ))}
    </div>
  )
}
