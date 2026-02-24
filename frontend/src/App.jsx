import { Routes, Route, NavLink } from 'react-router-dom';
import SearchView from './pages/SearchView';
import HistoryView from './pages/HistoryView';
import AboutView from './pages/AboutView';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Weather App</h1>
        <nav className="app-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Search</NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>History</NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>About</NavLink>
        </nav>
      </header>
      <main className="app-main container">
        <Routes>
          <Route path="/" element={<SearchView />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/about" element={<AboutView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
