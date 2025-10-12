export default function Footer() {
  return (
    <footer className="bg-slate-950 py-8 text-center border-t border-slate-800">
      <p className="text-slate-400 text-sm">
        © {new Date().getFullYear()} Security Zone. Todos os direitos reservados.
      </p>
      <p className="text-slate-500 mt-2 text-sm">
        Desenvolvido por <span className="text-cyan-400">Camila Lídia</span> e <span className="text-cyan-400">Rafael Figueiredo</span>.
      </p>
    </footer>
  );
}
