import React, { useEffect, useState } from "react";
import "./FarmFreshSplash.css";

interface Props {
  onFinish: () => void;
}

const FarmFreshSplash: React.FC<Props> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onFinish();
          }, 500);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="splash-container">
      <div className="glow-circle top"></div>
      <div className="glow-circle bottom"></div>

      <div className="splash-content">
        <div className="icon-box">
          🌱
          <div className="mini-badge">📊</div>
        </div>

        <div className="title">
          <span className="dark">FarmFresh</span>
          <span className="green">Advisory</span>
        </div>

        <div className="subtitle">
          <span></span>
          SMART FARM ADVISORY
          <span></span>
        </div>

        <div className="progress-wrapper">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="progress-text">
            <span>SYSTEM LOAD</span>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="bottom-info">
          <div>✔ SECURE NEURAL LINK</div>
          <div className="version">
            v5.0.1 • Dark Mode Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmFreshSplash;
