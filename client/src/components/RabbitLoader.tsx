export default function RabbitLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center">
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/BIbPhKWDPrNqpRwc.png"
        alt="Loading..."
        className={`${sizeClasses[size]} animate-bounce`}
        style={{
          animation: "bounce 1s infinite",
        }}
      />
    </div>
  );
}
