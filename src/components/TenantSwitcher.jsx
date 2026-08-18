import React from "react";
import { useTenant } from "../context/TenantContext";
import { Building2, ChevronDown, Check } from "lucide-react";

const styles = {
  wrapper: {
    position: "relative",
    display: "inline-block",
  },
  button: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "inherit",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "4px",
    minWidth: "240px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "var(--bg-card, #1e293b)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    zIndex: 100,
    overflow: "hidden",
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "inherit",
    textAlign: "left",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    background: "transparent",
    color: "inherit",
  },
  itemActive: {
    background: "rgba(99, 102, 241, 0.15)",
  },
};

export function TenantSwitcher() {
  const { tenantId, tenantName, setTenant, knownTenants } = useTenant();
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={styles.wrapper} ref={ref}>
      <button
        style={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch organisation"
        aria-expanded={isOpen}
      >
        <Building2 size={16} />
        <span>{tenantName}</span>
        <ChevronDown
          size={14}
          style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {isOpen && (
        <div style={styles.dropdown} role="menu">
          {knownTenants.map((tenant) => (
            // A <div role="menuitem"> with only an onClick is unreachable by
            // keyboard: it takes no focus, so Tab skips it and Enter/Space never
            // arrive. The organisation switcher was therefore mouse-only. A real
            // <button> is focusable and activates on both keys with no handler of
            // our own, which is why this is a swap rather than an onKeyDown.
            <button
              key={tenant.id}
              type="button"
              role="menuitem"
              aria-current={tenant.id === tenantId}
              style={{
                ...styles.item,
                ...(tenant.id === tenantId ? styles.itemActive : {}),
              }}
              onClick={() => {
                setTenant(tenant.id);
                setIsOpen(false);
              }}
            >
              <span>{tenant.name}</span>
              {tenant.id === tenantId && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
