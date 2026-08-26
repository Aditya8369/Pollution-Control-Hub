import React, { useState, useEffect, useCallback } from "react";

const SHOW_THRESHOLD_PX = 320;

export default function ScrollToTopButton() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > SHOW_THRESHOLD_PX);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    if (!isVisible) return null;

    return (
        <button
            type="button"
            className="scroll-to-top-btn"
            onClick={scrollToTop}
            aria-label="Scroll to top"
            title="Scroll to top"
        >
            ↑
        </button>
    );
}