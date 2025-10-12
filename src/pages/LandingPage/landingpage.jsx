import Navbar from "./components/navbar.jsx";
import GameEx from "./components/gameEx.jsx";
import Descriptions from "./components/descriptions.jsx";
import Carrosel from "./components/carrosel.jsx";
import Footer from "./components/footer.jsx";

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-slate-900 text-white font-sans">
      <Navbar />
      <main>
        <GameEx />
        <Descriptions />    
        <Carrosel />
      </main>
      <Footer />
    </div>
  );
}
