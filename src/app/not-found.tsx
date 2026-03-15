import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-4">
      <h2 className="text-4xl font-bold mb-4">404 - Página Não Encontrada</h2>
      <p className="text-lg text-slate-600 mb-8">Desculpe, não conseguimos encontrar a página que você está procurando.</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}
