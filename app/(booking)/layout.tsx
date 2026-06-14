import IOSInstallBanner from '@/components/IOSInstallBanner'

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <IOSInstallBanner />
    </>
  )
}
