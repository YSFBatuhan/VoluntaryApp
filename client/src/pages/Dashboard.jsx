import React from 'react';

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Impact & Statistics</h1>
        <p className="subtitle">
          Your voice has traveled thousands of miles and touched hundreds of lives.<br/>
          Explore the reach of your stories.
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Soldaki Grafik Kartı */}
        <div className="card stat-card wide-card">
          <div className="card-header">
            <h3>Listening Trends</h3>
            <span className="badge-light">Last 30 Days</span>
          </div>
          <p className="card-desc">Total listen time across all narrated works</p>
          
          {/* STITCH Grafiği Benzetimi */}
          <div className="chart-placeholder">
            <div className="bar" style={{height: '35%'}}></div>
            <div className="bar" style={{height: '50%'}}></div>
            <div className="bar" style={{height: '40%'}}></div>
            <div className="bar" style={{height: '75%'}}></div>
            <div className="bar" style={{height: '60%'}}></div>
            <div className="bar" style={{height: '100%'}}></div>
            <div className="bar" style={{height: '85%'}}></div>
          </div>
          <div className="chart-labels">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Sağdaki Duygu Analizi Kartı */}
        <div className="card stat-card">
          <div className="card-header">
            <h3>Listener Sentiment</h3>
          </div>
          <p className="card-desc">Emotional resonance of your voice</p>
          
          <div className="sentiment-list">
            <div className="sentiment-item">
              <div className="icon-circle" style={{background: '#F9E8EE'}}>🤍</div>
              <div className="progress-container">
                <div className="progress-info"><span>Comforting</span><span>88%</span></div>
                <div className="progress-bar"><div className="fill" style={{width: '88%', background: '#614853'}}></div></div>
              </div>
            </div>

            <div className="sentiment-item">
              <div className="icon-circle" style={{background: '#E6F0E6'}}>🧠</div>
              <div className="progress-container">
                <div className="progress-info"><span>Clear & Concise</span><span>94%</span></div>
                <div className="progress-bar"><div className="fill" style={{width: '94%', background: '#3D4F3D'}}></div></div>
              </div>
            </div>

            <div className="sentiment-item">
              <div className="icon-circle" style={{background: '#EAF3D9'}}>✨</div>
              <div className="progress-container">
                <div className="progress-info"><span>Inspiring</span><span>72%</span></div>
                <div className="progress-bar"><div className="fill" style={{width: '72%', background: '#6B7A55'}}></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
