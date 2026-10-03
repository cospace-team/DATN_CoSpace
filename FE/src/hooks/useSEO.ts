import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
}

const DEFAULT_TITLE = "CoSpace - Quản Lý Co-Working Space & Mạng Lưới Đối Tác";
// Keep in sync with the description meta tags in index.html (what link previews read).
const DEFAULT_DESCRIPTION =
  "CoSpace - đặt bàn làm việc, phòng họp và văn phòng riêng theo giờ, ngày, tuần hoặc tháng. Chọn chỗ trên sơ đồ, thanh toán online, check-in bằng mã QR.";

export function useSEO({ title, description }: SEOProps = {}) {
  useEffect(() => {
    // Set document title
    const fullTitle = title ? `${title} | CoSpace` : DEFAULT_TITLE;
    document.title = fullTitle;

    // Set meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", description || DEFAULT_DESCRIPTION);
    }

    // Set og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", fullTitle);
    }

    // Set og:description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute("content", description || DEFAULT_DESCRIPTION);
    }

    // Set twitter:title
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute("content", fullTitle);
    }

    // Set twitter:description
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) {
      twitterDesc.setAttribute("content", description || DEFAULT_DESCRIPTION);
    }
  }, [title, description]);
}

export default useSEO;
