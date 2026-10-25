
import { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function Calendario() {
  const [mesAtual, setMesAtual] = useState(new Date());

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril",
    "Maio", "Junho", "Julho", "Agosto",
    "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  function mudarMes(diferenca) {
    setMesAtual(new Date(ano, mes + diferenca, 1));
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />

      <main className="p-6 md:ml-64">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">
          Calendário
        </h1>

        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              onClick={() => mudarMes(-1)}
              className="rounded-lg bg-slate-200 px-4 py-2 hover:bg-slate-300"
            >
              Anterior
            </button>

            <h2 className="text-xl font-semibold text-slate-800">
              {nomesMeses[mes]} de {ano}
            </h2>

            <button
              onClick={() => mudarMes(1)}
              className="rounded-lg bg-slate-200 px-4 py-2 hover:bg-slate-300"
            >
              Próximo
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
              (dia) => (
                <div key={dia} className="p-2 font-bold text-slate-600">
                  {dia}
                </div>
              )
            )}

            {Array.from({ length: primeiroDia }, (_, i) => (
              <div key={`vazio-${i}`} />
            ))}

            {Array.from({ length: totalDias }, (_, i) => (
              <div
                key={i + 1}
                className="flex min-h-16 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-blue-100"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
