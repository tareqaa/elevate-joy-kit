import React from "react";

export interface CatPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  lang?: string;
  scrollSelector?: string;
}

export function CatPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 25,
  onPageChange,
  lang = "ar",
  scrollSelector = ".cat-products-toolbar",
}: CatPaginationProps) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageClick = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    onPageChange(page);
    const target = document.querySelector(scrollSelector);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 350, behavior: "smooth" });
    }
  };

  // Generate compact page numbers list (handles large page counts gracefully)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="cat-pagination-bar">
      <div className="cat-pagination-info">
        {lang === "en" ? (
          <>
            Showing <span className="highlight">{start}–{end}</span> of{" "}
            <span className="highlight">{totalItems}</span> products
          </>
        ) : (
          <>
            عرض <span className="highlight">{start}–{end}</span> من أصل{" "}
            <span className="highlight">{totalItems}</span> منتج
          </>
        )}
      </div>

      <div className="cat-pagination-nav">
        <button
          type="button"
          className="cat-page-btn nav-step"
          disabled={currentPage === 1}
          onClick={() => handlePageClick(currentPage - 1)}
          title={lang === "en" ? "Previous Page" : "الصفحة السابقة"}
        >
          {lang === "en" ? "← Prev" : "السابق →"}
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="cat-page-ellipsis" style={{ padding: "0 4px", color: "#64748b" }}>
                …
              </span>
            );
          }
          const pageNum = Number(p);
          const isActive = currentPage === pageNum;
          return (
            <button
              key={pageNum}
              type="button"
              className={`cat-page-btn ${isActive ? "is-active" : ""}`}
              onClick={() => handlePageClick(pageNum)}
              aria-current={isActive ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          className="cat-page-btn nav-step"
          disabled={currentPage === totalPages}
          onClick={() => handlePageClick(currentPage + 1)}
          title={lang === "en" ? "Next Page" : "الصفحة التالية"}
        >
          {lang === "en" ? "Next →" : "← التالي"}
        </button>
      </div>
    </div>
  );
}
