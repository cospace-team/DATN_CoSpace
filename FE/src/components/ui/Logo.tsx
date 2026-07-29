import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  iconClassName?: string;
  textClassName?: string;
  isDarkBackground?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = "flex items-center gap-3",
  showText = true,
  iconClassName = "h-10 w-10",
  textClassName = "text-xl font-bold tracking-tight",
  isDarkBackground = false,
}) => {
  return (
    <div className={className}>
      {/* Logo Icon: Interconnected Nodes */}
      <svg
        className={`${iconClassName} shrink-0 transition-transform duration-300 group-hover:scale-105`}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#4F46E5" />
        <circle cx="14" cy="14" r="3" fill="white" />
        <circle cx="26" cy="14" r="3" fill="white" />
        <circle cx="14" cy="26" r="3" fill="white" />
        <circle cx="26" cy="26" r="3" fill="white" />
        <path d="M14 14L26 26" stroke="white" stroke-width="1.5" />
        <path d="M26 14L14 26" stroke="white" stroke-width="1.5" />
      </svg>

      {/* Logo Text: "CoSpace" */}
      {showText && (
        <span className={textClassName}>
          <span
            className={
              isDarkBackground
                ? "text-white"
                : "text-foreground dark:text-white"
            }
          >
            Co
          </span>
          <span className="text-[#4F46E5]">Space</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
