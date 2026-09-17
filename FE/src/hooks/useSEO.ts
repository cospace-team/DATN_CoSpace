import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
}

const DEFAULT_TITLE = "CoSpace - Quản Lý Co-Working Space & Mạng Lưới Đối Tác";
const DEFAULT_DESCRIPTION =
  "CoSpace - Hệ thống quản lý co-working space & mạng lưới kết nối đối tác thông minh. Đặt chỗ linh hoạt theo giờ, ngày, tháng, check-in QR, thanh toán tiện lợi.";

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
