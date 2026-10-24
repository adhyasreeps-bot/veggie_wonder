/**
 * Particle and Effects System for Fruit Duel
 * Manages blade slice ribbons, juice droplets, splats, floating score popups, and toxic bursts.
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.splats = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  // Blade trail point addition
  createJuiceExplosion(x, y, colors, count = 20, isPoison = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      const size = 3 + Math.random() * 6;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size,
        color,
        alpha: 1,
        gravity: 0.25,
        decay: 0.02 + Math.random() * 0.02,
        isPoison
      });
    }

    // Add a splat decal
    this.splats.push({
      x: x + (Math.random() * 20 - 10),
      y: y + (Math.random() * 20 - 10),
      radius: 18 + Math.random() * 18,
      color: colors[0],
      alpha: 0.65,
      decay: 0.003
    });

    if (isPoison) {
      // Toxic shockwave
      this.shockwaves.push({
        x,
        y,
        radius: 10,
        maxRadius: 140,
        color: '#e040fb',
        alpha: 0.9,
        speed: 9
      });
    }
  }

  addFloatingText(x, y, text, color = '#ffffff', fontSize = 24, strokeColor = '#000000') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      strokeColor,
      fontSize,
      alpha: 1,
      scale: 0.6,
      targetScale: 1.2,
      vy: -2.5,
      life: 1.0,
      decay: 0.025
    });
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update splats
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const s = this.splats[i];
      s.alpha -= s.decay;
      if (s.alpha <= 0) {
        this.splats.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= ft.decay;
      ft.alpha = Math.max(0, ft.life);
      ft.scale += (ft.targetScale - ft.scale) * 0.15;

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha -= 0.04;
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  drawSplats(ctx) {
    this.splats.forEach((s) => {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();

      // Little satellite drops around splat
      for (let j = 0; j < 4; j++) {
        const a = (j * Math.PI) / 2 + 0.4;
        ctx.beginPath();
        ctx.arc(
          s.x + Math.cos(a) * (s.radius * 1.3),
          s.y + Math.sin(a) * (s.radius * 1.3),
          s.radius * 0.28,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();
    });
  }

  drawParticles(ctx) {
    // Shockwaves
    this.shockwaves.forEach((sw) => {
      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = 6;
      ctx.strokeStyle = sw.color;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Juice particles
    this.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      if (p.isPoison) {
        ctx.shadowColor = '#e040fb';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    });

    // Floating Texts
    this.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);
      ctx.font = `900 ${ft.fontSize}px 'Luckiest Guy', 'Fredoka', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Thick stroke
      ctx.lineWidth = 5;
      ctx.strokeStyle = ft.strokeColor;
      ctx.strokeText(ft.text, 0, 0);

      // Fill
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      ctx.restore();
    });
  }

  // Draw smooth blade trails for a player
  static drawBladeTrail(ctx, points, bladeColor = '#ffffff', glowColor = '#00e5ff') {
    if (!points || points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const progress = i / points.length; // 0 (tail) to 1 (blade head)
      const alpha = progress * (p2.life || 1);

      // Glow pass
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = 12 * progress + 2;
      ctx.strokeStyle = glowColor;
      ctx.globalAlpha = alpha * 0.45;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Sharp blade core
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = 5 * progress + 1.5;
      ctx.strokeStyle = bladeColor;
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }

    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.splats = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }
}
