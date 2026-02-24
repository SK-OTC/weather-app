import './AboutView.css';

export default function AboutView() {
  return (
    <div className="about-container">
      <div className="about-content">
        <h2 className="about-title">About</h2>
        
        <div className="about-person">
          <h3>Farah Bakhtiar Huda</h3>
        </div>

        <div className="about-description">
          <h4>The Product Manager Accelerator Program</h4>
          <p>
            The Product Manager Accelerator Program is designed to support PM professionals through every stage of their careers. From students looking for entry-level jobs to Directors looking to take on a leadership role, our program has helped over hundreds of students fulfill their career aspirations.
          </p>
          <p>
            To find out more, visit <a href="https://www.pmaccelerator.io/" target="_blank" rel="noopener noreferrer">https://www.pmaccelerator.io/</a>
          </p>
        </div>
      </div>
    </div>
  );
}
