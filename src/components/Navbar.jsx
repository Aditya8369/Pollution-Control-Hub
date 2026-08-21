import { startTour } from '../utils/tour';

// Inside your render/return method:
<div className="help-menu-dropdown">
  <button className="help-dropdown-toggle">Help</button>
  <div className="dropdown-content">
    <button 
      id="help-tour-btn"
      type="button" 
      onClick={() => startTour()}
    >
      Start Tour
    </button>
  </div>
</div>
