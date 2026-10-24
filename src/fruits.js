/**
 * 3D Cartoon Procedural Fruit Renderers for Fruit Duel
 * Styled directly after the Veggie Wonder reference image:
 * Expressive cute faces, glossy highlights, 3D bubbly gradients, and realistic split halves.
 */

export const FRUIT_TYPES = {
  WATERMELON: 'watermelon',
  APPLE: 'apple',
  BANANA: 'banana',
  ORANGE: 'orange',
  STRAWBERRY: 'strawberry',
  PINEAPPLE: 'pineapple',
  POISON: 'poison_berry'
};

export const FRUIT_CONFIGS = {
  [FRUIT_TYPES.WATERMELON]: {
    name: 'Juicy Watermelon',
    radius: 46,
    points: 20,
    isPoison: false,
    color: '#ff3b56',
    innerColor: '#ff2a4a',
    juiceColors: ['#ff3b56', '#ff6b8b', '#2e7d32', '#fff'],
    emoji: '🍉'
  },
  [FRUIT_TYPES.APPLE]: {
    name: 'Sweet Apple',
    radius: 40,
    points: 10,
    isPoison: false,
    color: '#e53935',
    innerColor: '#fff9c4',
    juiceColors: ['#e53935', '#ff8a80', '#fff9c4'],
    emoji: '🍎'
  },
  [FRUIT_TYPES.BANANA]: {
    name: 'Sunny Banana',
    radius: 42,
    points: 15,
    isPoison: false,
    color: '#fdd835',
    innerColor: '#fffde7',
    juiceColors: ['#fdd835', '#fff59d', '#fffde7'],
    emoji: '🍌'
  },
  [FRUIT_TYPES.ORANGE]: {
    name: 'Tangy Orange',
    radius: 38,
    points: 12,
    isPoison: false,
    color: '#fb8c00',
    innerColor: '#ffe082',
    juiceColors: ['#fb8c00', '#ffa726', '#ffe082', '#fff'],
    emoji: '🍊'
  },
  [FRUIT_TYPES.STRAWBERRY]: {
    name: 'Ruby Berry',
    radius: 36,
    points: 15,
    isPoison: false,
    color: '#e91e63',
    innerColor: '#f8bbd0',
    juiceColors: ['#e91e63', '#ff4081', '#f8bbd0'],
    emoji: '🍓'
  },
  [FRUIT_TYPES.PINEAPPLE]: {
    name: 'Golden Pineapple',
    radius: 45,
    points: 25,
    isPoison: false,
    color: '#fbc02d',
    innerColor: '#fff59d',
    juiceColors: ['#fbc02d', '#fff176', '#4caf50'],
    emoji: '🍍'
  },
  [FRUIT_TYPES.POISON]: {
    name: 'Toxic Skull Berry',
    radius: 42,
    points: 0,
    isPoison: true,
    color: '#7b1fa2',
    innerColor: '#4a148c',
    juiceColors: ['#9c27b0', '#e040fb', '#311b92', '#b388ff', '#00e676'],
    emoji: '☠️'
  }
};

/**
 * Helper to draw cute Pixar-style cartoon eyes with specular highlights & rosy cheeks
 */
function drawCuteFace(ctx, x, y, size = 1, isPoison = false, time = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  if (isPoison) {
    // Narrowed mischievous eyes
    const eyeOffsetX = 12;
    const eyeOffsetY = -4;

    // Glowing purple eye sockets
    [-eyeOffsetX, eyeOffsetX].forEach((ex) => {
      ctx.beginPath();
      ctx.ellipse(ex, eyeOffsetY, 9, 6, ex < 0 ? 0.3 : -0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#210038';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e040fb';
      ctx.stroke();

      // Sharp glowing iris
      ctx.beginPath();
      ctx.ellipse(ex + (ex < 0 ? 2 : -2), eyeOffsetY, 4, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff1744';
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(ex + (ex < 0 ? 1 : -3), eyeOffsetY - 1.5, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    // Wicked smirk
    ctx.beginPath();
    ctx.arc(0, 7, 10, 0.2, Math.PI - 0.2, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#210038';
    ctx.stroke();

    // Cute vampire fang
    ctx.beginPath();
    ctx.moveTo(3, 8);
    ctx.lineTo(5, 13);
    ctx.lineTo(7, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
    return;
  }

  // Cute Normal Eyes
  const eyeDistance = 14;
  const eyeY = -3;
  const eyeRadius = 7.5;

  [-eyeDistance, eyeDistance].forEach((ex) => {
    // Eye white
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeRadius, eyeRadius * 1.15, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#2d1b08';
    ctx.stroke();

    // Big shiny dark pupil
    ctx.beginPath();
    ctx.arc(ex + (ex < 0 ? 1 : -1), eyeY + 1, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b18';
    ctx.fill();

    // Specular big shine
    ctx.beginPath();
    ctx.arc(ex - 1.5, eyeY - 1.5, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Specular small sparkle
    ctx.beginPath();
    ctx.arc(ex + 1.8, eyeY + 2.2, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  // Rosy cheeks
  [-eyeDistance - 4, eyeDistance + 4].forEach((cx) => {
    ctx.beginPath();
    ctx.ellipse(cx, eyeY + 8, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 99, 132, 0.45)';
    ctx.fill();
  });

  // Happy open smile
  ctx.beginPath();
  ctx.arc(0, eyeY + 7, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2d1b08';
  ctx.stroke();

  // Little pink tongue
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, eyeY + 7, 6, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.fillStyle = '#ff7597';
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Draws the whole fruit on the canvas
 */
export function drawFruit(ctx, fruit, time = 0) {
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.rotation);

  const cfg = FRUIT_CONFIGS[fruit.type];
  const r = fruit.radius;

  const isPoisonFruit = Boolean(fruit.isPoison || fruit.type === FRUIT_TYPES.POISON);

  // Toxic aura if poison
  if (isPoisonFruit) {
    const pulse = 1 + Math.sin(time * 8) * 0.15;
    const auraGrad = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.8 * pulse);
    auraGrad.addColorStop(0, 'rgba(171, 71, 188, 0.6)');
    auraGrad.addColorStop(0.6, 'rgba(123, 31, 162, 0.28)');
    auraGrad.addColorStop(1, 'rgba(74, 20, 140, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.8 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = auraGrad;
    ctx.fill();

    // Floating mini spectral skulls orbiting
    for (let s = 0; s < 3; s++) {
      const orbitAngle = time * 3 + (s * (Math.PI * 2 / 3));
      const ox = Math.cos(orbitAngle) * (r * 1.35);
      const oy = Math.sin(orbitAngle) * (r * 1.35);

      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(0.85, 0.85);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3.5, 0, 7, 4);
      ctx.fillStyle = '#4a148c';
      ctx.fillRect(-2.5, -3, 2, 2);
      ctx.fillRect(0.5, -3, 2, 2);
      ctx.restore();
    }
  }

  // Drop shadow
  ctx.save();
  ctx.shadowColor = isPoisonFruit ? 'rgba(156, 39, 176, 0.45)' : 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 8;

  switch (fruit.type) {
    case FRUIT_TYPES.WATERMELON: {
      // 3D Watermelon slice wedge
      ctx.beginPath();
      ctx.arc(0, -r * 0.4, r * 1.25, 0.25 * Math.PI, 0.75 * Math.PI, false);
      ctx.closePath();
      // Outer green rind
      ctx.fillStyle = '#1b5e20';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2e7d32';
      ctx.stroke();

      // Pale inner rind
      ctx.beginPath();
      ctx.arc(0, -r * 0.4, r * 1.18, 0.27 * Math.PI, 0.73 * Math.PI, false);
      ctx.closePath();
      ctx.fillStyle = '#c8e6c9';
      ctx.fill();

      // Ruby red flesh
      ctx.beginPath();
      ctx.arc(0, -r * 0.4, r * 1.1, 0.28 * Math.PI, 0.72 * Math.PI, false);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, r * 0.1, r * 0.2, 0, r * 0.2, r * 1.1);
      grad.addColorStop(0, '#ff5252');
      grad.addColorStop(1, '#d50000');
      ctx.fillStyle = grad;
      ctx.fill();

      // Black seeds
      const seeds = [
        [-r * 0.4, r * 0.35],
        [r * 0.4, r * 0.35],
        [-r * 0.2, r * 0.55],
        [r * 0.2, r * 0.55],
        [0, r * 0.7]
      ];
      seeds.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 3, 5, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#212121';
        ctx.fill();
      });

      // Cute face in center
      drawCuteFace(ctx, 0, r * 0.2, 0.95, isPoisonFruit, time);
      break;
    }

    case FRUIT_TYPES.APPLE: {
      // 3D Apple body
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#ff5252');
      grad.addColorStop(0.7, '#d32f2f');
      grad.addColorStop(1, '#b71c1c');

      // Apple lobes
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.bezierCurveTo(-r * 0.8, -r * 1.1, -r * 1.2, r * 0.3, -r * 0.8, r * 0.9);
      ctx.bezierCurveTo(-r * 0.4, r * 1.15, -r * 0.1, r * 0.95, 0, r * 0.9);
      ctx.bezierCurveTo(r * 0.1, r * 0.95, r * 0.4, r * 1.15, r * 0.8, r * 0.9);
      ctx.bezierCurveTo(r * 1.2, r * 0.3, r * 0.8, -r * 1.1, 0, -r * 0.6);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#8b0000';
      ctx.stroke();

      // Stem & Green leaf
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.quadraticCurveTo(-4, -r * 1.1, -8, -r * 1.3);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#5d4037';
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(8, -r * 1.05, 10, 5, 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#43a047';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#2e7d32';
      ctx.stroke();

      // Glossy highlight
      ctx.beginPath();
      ctx.ellipse(-r * 0.45, -r * 0.4, 7, 12, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();

      // Cute face
      drawCuteFace(ctx, 0, r * 0.1, 0.9, isPoisonFruit, time);
      break;
    }

    case FRUIT_TYPES.BANANA: {
      // 3D Crescent Banana
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.7);
      ctx.quadraticCurveTo(0, -r * 0.2, r * 0.9, r * 0.6);
      ctx.quadraticCurveTo(r * 0.7, r * 0.9, r * 0.5, r * 0.9);
      ctx.quadraticCurveTo(-0.1, r * 0.4, -r * 0.9, -r * 0.5);
      ctx.closePath();

      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, '#fff176');
      grad.addColorStop(0.5, '#fbc02d');
      grad.addColorStop(1, '#f57f17');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f57f17';
      ctx.stroke();

      // Brown tip & stem
      ctx.beginPath();
      ctx.ellipse(-r * 0.9, -r * 0.65, 4, 3, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#5d4037';
      ctx.fill();

      // Banana face
      drawCuteFace(ctx, -2, r * 0.1, 0.85, isPoisonFruit, time);
      ctx.restore();
      break;
    }

    case FRUIT_TYPES.ORANGE: {
      // 3D Orange Sphere
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#ffb74d');
      grad.addColorStop(0.7, '#ff9800');
      grad.addColorStop(1, '#e65100');

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e65100';
      ctx.stroke();

      // Little leaf on top
      ctx.beginPath();
      ctx.ellipse(4, -r * 0.95, 8, 4, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#4caf50';
      ctx.fill();

      // Specular shine
      ctx.beginPath();
      ctx.ellipse(-r * 0.4, -r * 0.4, 8, 5, -0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // Cute face
      drawCuteFace(ctx, 0, r * 0.05, 0.9, isPoisonFruit, time);
      break;
    }

    case FRUIT_TYPES.STRAWBERRY: {
      // 3D Plump Strawberry
      ctx.beginPath();
      ctx.moveTo(0, r * 1.05);
      ctx.bezierCurveTo(-r * 1.1, r * 0.4, -r * 0.9, -r * 0.7, 0, -r * 0.8);
      ctx.bezierCurveTo(r * 0.9, -r * 0.7, r * 1.1, r * 0.4, 0, r * 1.05);
      ctx.closePath();

      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#ff4081');
      grad.addColorStop(0.7, '#e91e63');
      grad.addColorStop(1, '#880e4f');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#c2185b';
      ctx.stroke();

      // Seeds
      const pips = [
        [-r * 0.4, -r * 0.2], [r * 0.4, -r * 0.2],
        [-r * 0.5, r * 0.3], [r * 0.5, r * 0.3],
        [-r * 0.2, r * 0.65], [r * 0.2, r * 0.65]
      ];
      pips.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.ellipse(px, py, 2, 3, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff59d';
        ctx.fill();
      });

      // Leaf crown
      ctx.beginPath();
      ctx.moveTo(-16, -r * 0.75);
      ctx.lineTo(-8, -r * 1.05);
      ctx.lineTo(0, -r * 0.78);
      ctx.lineTo(8, -r * 1.05);
      ctx.lineTo(16, -r * 0.75);
      ctx.closePath();
      ctx.fillStyle = '#43a047';
      ctx.fill();

      // Cute face
      drawCuteFace(ctx, 0, r * 0.1, 0.85, isPoisonFruit, time);
      break;
    }

    case FRUIT_TYPES.PINEAPPLE: {
      // Golden Pineapple
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, r * 0.85, r * 1.05, 0, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.2, r * 0.1, 0, r * 0.1, r);
      grad.addColorStop(0, '#fff176');
      grad.addColorStop(0.6, '#fbc02d');
      grad.addColorStop(1, '#f57f17');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e65100';
      ctx.stroke();

      // Diamond scale crosshatch
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(230, 81, 0, 0.3)';
      ctx.lineWidth = 2;
      for (let i = -r; i <= r; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i - 20, -r);
        ctx.lineTo(i + 20, r * 1.2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i + 20, -r);
        ctx.lineTo(i - 20, r * 1.2);
        ctx.stroke();
      }
      ctx.restore();

      // Spiky crown of leaves
      ctx.beginPath();
      ctx.moveTo(-18, -r * 0.75);
      ctx.lineTo(-24, -r * 1.35);
      ctx.lineTo(-10, -r * 0.95);
      ctx.lineTo(0, -r * 1.45);
      ctx.lineTo(10, -r * 0.95);
      ctx.lineTo(24, -r * 1.35);
      ctx.lineTo(18, -r * 0.75);
      ctx.closePath();
      ctx.fillStyle = '#388e3c';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1b5e20';
      ctx.stroke();

      // Cool face
      drawCuteFace(ctx, 0, r * 0.15, 0.95, isPoisonFruit, time);
      break;
    }

    case FRUIT_TYPES.POISON: {
      // ☠️ TOXIC SKULL BLACKBERRY
      // Pulsating purple/magenta aura
      const pulse = 1 + Math.sin(time * 8) * 0.15;
      const auraGrad = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.7 * pulse);
      auraGrad.addColorStop(0, 'rgba(171, 71, 188, 0.5)');
      auraGrad.addColorStop(0.6, 'rgba(123, 31, 162, 0.25)');
      auraGrad.addColorStop(1, 'rgba(74, 20, 140, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, r * 1.7 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = auraGrad;
      ctx.fill();

      // Deep blackberry bubbles cluster
      const bubbles = [
        [0, 0, r * 0.65],
        [-r * 0.45, -r * 0.35, r * 0.45],
        [r * 0.45, -r * 0.35, r * 0.45],
        [-r * 0.55, r * 0.25, r * 0.42],
        [r * 0.55, r * 0.25, r * 0.42],
        [0, r * 0.55, r * 0.45],
        [0, -r * 0.55, r * 0.42]
      ];

      bubbles.forEach(([bx, by, br]) => {
        const bGrad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br);
        bGrad.addColorStop(0, '#ab47bc');
        bGrad.addColorStop(0.6, '#4a148c');
        bGrad.addColorStop(1, '#1a0033');

        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = bGrad;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e040fb';
        ctx.stroke();
      });

      // Toxic stem with thorns
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75);
      ctx.quadraticCurveTo(5, -r * 1.15, 2, -r * 1.35);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#00e676';
      ctx.stroke();

      // Floating mini spectral skulls orbiting
      for (let s = 0; s < 3; s++) {
        const orbitAngle = time * 3 + (s * (Math.PI * 2 / 3));
        const ox = Math.cos(orbitAngle) * (r * 1.3);
        const oy = Math.sin(orbitAngle) * (r * 1.3);

        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(0.8, 0.8);
        ctx.fillStyle = '#ffffff';
        // mini skull
        ctx.beginPath();
        ctx.arc(0, -2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-3.5, 0, 7, 4);
        // tiny eyes
        ctx.fillStyle = '#4a148c';
        ctx.fillRect(-2.5, -3, 2, 2);
        ctx.fillRect(0.5, -3, 2, 2);
        ctx.restore();
      }

      // Mischievous poison face
      drawCuteFace(ctx, 0, 0, 1.0, true, time);
      break;
    }
  }

  ctx.restore(); // shadow
  ctx.restore(); // transform
}

/**
 * Draws the sliced halves of a fruit falling apart with angle and velocity
 */
export function drawFruitHalf(ctx, half, time = 0) {
  ctx.save();
  ctx.translate(half.x, half.y);
  ctx.rotate(half.rotation);

  const cfg = FRUIT_CONFIGS[half.type];
  const r = half.radius;

  // Clip half plane based on isLeftHalf flag
  ctx.save();
  ctx.beginPath();
  if (half.isLeftHalf) {
    ctx.rect(-r * 1.8, -r * 1.8, r * 1.8, r * 3.6);
  } else {
    ctx.rect(0, -r * 1.8, r * 1.8, r * 3.6);
  }
  ctx.clip();

  // Draw regular fruit representation
  drawFruit(ctx, { ...half, x: 0, y: 0, rotation: 0 }, time);

  ctx.restore();

  // Draw exposed juicy cut cross-section along the cut axis
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95);
  ctx.lineTo(0, r * 0.95);
  ctx.lineWidth = 5;
  ctx.strokeStyle = cfg.innerColor;
  ctx.stroke();

  // Small seed or core detail on cut line
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.5, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = cfg.isPoison ? '#e040fb' : '#5d4037';
  ctx.fill();

  ctx.restore();
}
