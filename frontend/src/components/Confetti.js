import confetti from "canvas-confetti";

export function celebrate() {
  if (document.documentElement.classList.contains("reduce-motion")) return;
  const colors = ["#FFD166", "#B19CD9", "#45B69C", "#FDFCFD"];
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors,
  });
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors });
  }, 200);
}
