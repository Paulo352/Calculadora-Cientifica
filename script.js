(function(){
  'use strict';

  const output = document.getElementById('output');
  const historyEl = document.getElementById('history');
  const keys = document.querySelector('.keys');
  const degRadBtn = document.getElementById('degRadBtn');
  const secondBtn = document.getElementById('secondBtn');
  const memBtns = document.querySelectorAll('[data-mem]');

  let expr = '0';
  let lastAns = 0;
  let memory = 0;
  let mode = 'DEG'; // or 'RAD'
  let second = false;

  const setDisplay = (text) => { output.textContent = text; };
  const setHistory = (text) => { historyEl.textContent = text; };

  const resetAll = () => { expr = '0'; setDisplay(expr); setHistory(''); };
  resetAll();

  // Toggle DEG/RAD
  degRadBtn.addEventListener('click', () => {
    mode = (mode === 'DEG') ? 'RAD' : 'DEG';
    degRadBtn.textContent = mode;
    degRadBtn.setAttribute('aria-pressed', 'true');
  });

  // Toggle 2nd (funções inversas)
  secondBtn.addEventListener('click', () => {
    second = !second;
    secondBtn.setAttribute('aria-pressed', second ? 'true' : 'false');
    // Trocar rótulos dos botões trig
    document.querySelectorAll('[data-fn="sin"],[data-fn="cos"],[data-fn="tan"]').forEach(btn => {
      if (second) {
        if (btn.dataset.fn === 'sin') btn.textContent = 'asin';
        if (btn.dataset.fn === 'cos') btn.textContent = 'acos';
        if (btn.dataset.fn === 'tan') btn.textContent = 'atan';
      } else {
        if (btn.dataset.fn === 'sin') btn.textContent = 'sin';
        if (btn.dataset.fn === 'cos') btn.textContent = 'cos';
        if (btn.dataset.fn === 'tan') btn.textContent = 'tan';
      }
    });
  });

  // Memory buttons
  memBtns.forEach(b => {
    b.addEventListener('click', () => {
      const val = currentValue();
      switch (b.dataset.mem) {
        case 'mc': memory = 0; break;
        case 'mr': insertToken(Number.isFinite(memory) ? String(memory) : '0'); break;
        case 'mplus': memory += val; break;
        case 'mminus': memory -= val; break;
      }
    });
  });

  // Helpers
  const currentValue = () => {
    try { return evaluateExpression(expr); } catch { return 0; }
  };

  const insertToken = (t) => {
    if (expr === '0' && /[0-9.]/.test(t)) expr = t;
    else if (expr === '0' && !/[0-9.]/.test(t)) expr = '0' + t;
    else expr += t;
    setDisplay(expr);
  };

  const backspace = () => {
    if (expr.length <= 1) expr = '0';
    else expr = expr.slice(0, -1);
    setDisplay(expr);
  };

  const percent = () => {
    // substitui o último número por (n/100)
    const m = expr.match(/(\d*\.?\d+)(?!.*\d)/);
    if (!m) return;
    const n = m[1];
    expr = expr.slice(0, expr.lastIndexOf(n)) + '(' + n + '/100)';
    setDisplay(expr);
  };

  const toggleSign = () => {
    // aplica sinal ao último número ou expressão entre parênteses
    const i = expr.lastIndexOf('(');
    const j = expr.lastIndexOf(')');
    if (i > j) { // último grupo aberto
      expr = expr.slice(0, i) + '(-' + expr.slice(i + 1);
    } else {
      const m = expr.match(/(\d*\.?\d+)(?!.*\d)/);
      if (m) {
        const n = m[1];
        const start = expr.lastIndexOf(n);
        const before = expr[start - 1];
        if (before === '-' && (start - 2 < 0 || /[+\-*/^(]/.test(expr[start - 2]))) {
          // já negativo: remove
          expr = expr.slice(0, start - 1) + expr.slice(start);
        } else {
          expr = expr.slice(0, start) + '(-' + n + ')' + expr.slice(start + n.length);
        }
      } else {
        expr = '(-' + expr + ')';
      }
    }
    setDisplay(expr);
  };

  // Evaluation
  function evaluateExpression(raw) {
    // Mapeia tokens visuais para JS
    let s = raw;

    s = s.replace(/π/g, 'PI').replace(/e(?![a-zA-Z])/g, 'E');
    s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    s = s.replace(/\^/g, '**');

    // Funções de interface para DEG/RAD e inversas
    const __toRad = (x) => x * Math.PI / 180;
    const __toDeg = (x) => x * 180 / Math.PI;
    const __sin = (x) => Math.sin(mode === 'DEG' ? __toRad(x) : x);
    const __cos = (x) => Math.cos(mode === 'DEG' ? __toRad(x) : x);
    const __tan = (x) => Math.tan(mode === 'DEG' ? __toRad(x) : x);
    const __asin = (x) => mode === 'DEG' ? __toDeg(Math.asin(x)) : Math.asin(x);
    const __acos = (x) => mode === 'DEG' ? __toDeg(Math.acos(x)) : Math.acos(x);
    const __atan = (x) => mode === 'DEG' ? __toDeg(Math.atan(x)) : Math.atan(x);
    const __ln = (x) => Math.log(x);
    const __log10 = (x) => Math.log10(x);
    const __sqrt = (x) => Math.sqrt(x);
    const __square = (x) => x*x;
    const __inv = (x) => 1/x;
    const __fact = (n) => {
      if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    };

    // Troca nomes amigáveis por wrappers
    s = s.replace(/\bsin\(/g, '__sin(')
         .replace(/\bcos\(/g, '__cos(')
         .replace(/\btan\(/g, '__tan(')
         .replace(/\basin\(/g, '__asin(')
         .replace(/\bacos\(/g, '__acos(')
         .replace(/\batan\(/g, '__atan(')
         .replace(/\bln\(/g, '__ln(')
         .replace(/\blog\(/g, '__log10(')
         .replace(/\blog10\(/g, '__log10(')
         .replace(/√\(/g, '__sqrt(')
    ;

    // Funções pós-fixas específicas: n! e x² e 1/x (formatos gerados pelo UI)
    // Converte 5! -> __fact(5)
    s = s.replace(/(\d+(?:\.\d+)?)\!/g, '__fact($1)');
    // Converte x² -> __square(x)  (apenas quando gerado pelo UI com símbolo ²)
    s = s.replace(/\)²/g, ').__square')
         .replace(/(\d+(?:\.\d+)?)²/g, '__square($1)');
    // Em caso geral, interceptaremos x² via botão diretamente.

    // Sanitização: apenas tokens permitidos
    if (!/^[0-9+\-*/().,^\sPIE_ascintoglrqf!√]+$/i.test(s)) {
      throw new Error('Expressão inválida');
    }

    // Avaliação segura com escopo controlado
    // Usamos Function e passamos apenas símbolos permitidos via parâmetros
    const fn = new Function('PI','E','__sin','__cos','__tan','__asin','__acos','__atan','__ln','__log10','__sqrt','__square','__inv','__fact', 'return (' + s + ');');
    const v = fn(Math.PI, Math.E, __sin, __cos, __tan, __asin, __acos, __atan, __ln, __log10, __sqrt, __square, __inv, __fact);
    return v;
  }

  const equals = () => {
    try {
      const res = evaluateExpression(expr);
      const shown = Number.isFinite(res) ? res : 'Não definido';
      setHistory(expr + ' =');
      expr = String(shown);
      lastAns = Number.isFinite(res) ? res : lastAns;
      setDisplay(expr);
    } catch (e) {
      setHistory('Erro');
      setDisplay('Expressão inválida');
    }
  };

  // Clicks
  keys.addEventListener('click', (e) => {
    const btn = e.target.closest('button.key');
    if (!btn) return;

    const num = btn.getAttribute('data-num');
    const op = btn.getAttribute('data-op');
    const fn = btn.getAttribute('data-fn');
    const action = btn.getAttribute('data-action');
    const ins = btn.getAttribute('data-insert');
    const cnst = btn.getAttribute('data-const');

    if (num !== null) {
      if (expr === '0') expr = num;
      else expr += num;
      setDisplay(expr);
      return;
    }
    if (ins) { insertToken(ins); return; }
    if (cnst) {
      if (cnst === 'pi') insertToken('π');
      else if (cnst === 'e') insertToken('e');
      return;
    }
    if (op) {
      switch (op) {
        case 'add': insertToken('+'); break;
        case 'subtract': insertToken('−'); break;
        case 'multiply': insertToken('×'); break;
        case 'divide': insertToken('÷'); break;
        case 'pow': insertToken('^'); break;
      }
      return;
    }
    if (fn) {
      if (fn === 'sin') insertToken(second ? 'asin(' : 'sin(');
      else if (fn === 'cos') insertToken(second ? 'acos(' : 'cos(');
      else if (fn === 'tan') insertToken(second ? 'atan(' : 'tan(');
      else if (fn === 'ln') insertToken('ln(');
      else if (fn === 'log10') insertToken('log(');
      else if (fn === 'sqrt') insertToken('√(');
      else if (fn === 'square') insertToken('^2');
      else if (fn === 'inv') insertToken('1/(');
      else if (fn === 'fact') insertToken('!');
      return;
    }
    if (action) {
      switch (action) {
        case 'decimal':
          insertToken('.'); break;
        case 'equals':
          equals(); break;
        case 'clear':
          resetAll(); break;
        case 'clear-entry':
          // Limpa último número/parcela
          expr = expr.replace(/(.*?)([0-9.]+|\([^()]*\))$/,'$1') || '0';
          setDisplay(expr);
          break;
        case 'backspace':
          backspace(); break;
        case 'percent':
          percent(); break;
        case 'sign':
          toggleSign(); break;
        case 'ans':
          insertToken(String(lastAns)); break;
      }
      return;
    }
  });

  // Teclado
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (/^[0-9]$/.test(k)) { insertToken(k); return; }
    if (k === '.') { insertToken('.'); return; }
    if (k === '+') { insertToken('+'); return; }
    if (k === '-') { insertToken('−'); return; }
    if (k === '*') { insertToken('×'); return; }
    if (k === '/') { insertToken('÷'); return; }
    if (k === '^') { insertToken('^'); return; }
    if (k === '(' || k === ')') { insertToken(k); return; }
    if (k.toLowerCase() === 'p') { insertToken('π'); return; }
    if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); return; }
    if (k === 'Backspace') { backspace(); return; }
    if (k === 'Escape') { resetAll(); return; }
  });
})();