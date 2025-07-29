export default function SecurityAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', width: '100%', overflowY: 'auto', backgroundColor: 'white' }}>
      {children}
    </div>
  );
}