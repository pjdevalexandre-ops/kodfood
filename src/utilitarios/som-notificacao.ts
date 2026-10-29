/**
 * Emite um aviso sonoro agradável e nítido de novo pedido
 * utilizando a Web Audio API nativa do navegador.
 */
export function tocarSomNovoPedido() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    const agora = ctx.currentTime;

    // Primeiro beep (Frequência média agradável - 660 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(660, agora);

    gain1.gain.setValueAtTime(0.2, agora);
    gain1.gain.exponentialRampToValueAtTime(0.01, agora + 0.15);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(agora);
    osc1.stop(agora + 0.15);

    // Segundo beep mais agudo (880 Hz) para dar o tom de notificação "ding-dong"
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, agora + 0.18);

    gain2.gain.setValueAtTime(0.25, agora + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, agora + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(agora + 0.18);
    osc2.stop(agora + 0.45);
  } catch (erro) {
    console.warn('Não foi possível reproduzir o aviso sonoro:', erro);
  }
}
