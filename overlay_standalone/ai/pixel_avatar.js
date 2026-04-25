(function () {
  const SKIN = {
    rose: '#F2A18B', peach: '#E8A87C', warm: '#C8754D',
    deep: '#8E4A32', umber: '#5D2F25', gold: '#D99A54', cool: '#D58D83',
  };
  const HAIR = {
    soft:  { color: '#E7C45F', accent: '#E7C45F' },
    crop:  { color: '#26283B', accent: '#26283B' },
    bob:   { color: '#1C2233', accent: '#1C2233' },
    wave:  { color: '#6B2632', accent: '#6B2632' },
    bun:   { color: '#3A241E', accent: '#3A241E' },
    spike: { color: '#8B62D9', accent: '#8B62D9' },
    cap:   { color: '#7CB0E8', accent: '#E8A87C' },
    halo:  { color: '#E8A87C', accent: '#F3E5A3' },
  };
  const EYES = {
    warm: '#151722', bright: '#20384E', sleepy: '#342638', focus: '#11131B',
  };
  const OUTFIT = {
    hoodie: '#51616B', crew: '#8E3F32', jacket: '#1F3650',
    sweater: '#486E54', tunic: '#71578E', work: '#D99A54',
  };
  const ACCESSORY = {
    none:   { color: '#343746', accent: null },
    rounds: { color: '#1C2233', accent: '#E8A87C' },
    visor:  { color: '#7CB0E8', accent: null },
    phones: { color: '#B89AE8', accent: null },
    pin:    { color: '#9CE8A8', accent: null },
    star:   { color: '#F3E5A3', accent: null },
  };
  const BACKGROUND = {
    amber: '#E8A87C', blue: '#7CB0E8', green: '#9CE8A8', purple: '#B89AE8',
    coral: '#E8756B', moss: '#7FA075', gold: '#D8B75C', slate: '#51616B',
  };

  function hexA(hex, alpha) {
    if (!hex || !hex.startsWith('#')) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function r(x, y, w, h, fill) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  }

  window.renderPixelAvatar = function (traits) {
    const skin     = SKIN[traits.skin]       ?? '#E8A87C';
    const hair     = HAIR[traits.hair]       ?? { color: '#E7C45F', accent: '#E7C45F' };
    const eyes     = EYES[traits.eyes]       ?? '#151722';
    const outfit   = OUTFIT[traits.outfit]   ?? '#51616B';
    const acc      = ACCESSORY[traits.accessory] ?? ACCESSORY.none;
    const backdrop = BACKGROUND[traits.background] ?? '#E8A87C';

    const hairSvg = {
      soft:  r(56,48,72,24,hair.color) + r(72,32,40,24,hair.accent) + r(48,64,24,40,hair.color),
      crop:  r(56,40,80,28,hair.color) + r(48,56,24,56,hair.color) + r(120,56,24,48,hair.color),
      bob:   r(48,40,96,40,hair.color) + r(40,64,32,64,hair.color) + r(120,64,32,64,hair.color),
      wave:  r(48,48,88,24,hair.color) + r(56,32,24,24,hair.accent) + r(80,40,56,24,hair.color) + r(40,72,24,40,hair.color),
      bun:   r(56,48,80,24,hair.color) + r(80,32,32,24,hair.accent) + r(128,48,24,24,hair.color),
      spike: r(48,56,88,16,hair.color) + r(56,40,16,24,hair.color) + r(80,32,16,32,hair.accent) + r(104,40,16,24,hair.color),
      cap:   r(48,48,88,24,hair.color) + r(104,64,40,12,hair.accent),
      halo:  r(48,56,88,16,hair.color) + r(64,32,64,8,hair.accent),
    }[traits.hair] ?? '';

    let eyesSvg = '';
    if (traits.eyes === 'sleepy') {
      eyesSvg = r(72,84,16,4,eyes) + r(104,84,16,4,eyes);
    } else if (traits.eyes === 'focus') {
      eyesSvg = r(72,80,16,8,eyes) + r(104,80,16,8,eyes)
              + r(72,76,16,4,hexA('#08090f',0.65)) + r(104,76,16,4,hexA('#08090f',0.65));
    } else {
      eyesSvg = r(72,80,12,12,eyes) + r(108,80,12,12,eyes);
      if (traits.eyes === 'bright') eyesSvg += r(76,80,4,4,'#E8E3D8') + r(112,80,4,4,'#E8E3D8');
    }

    let accSvg = '';
    if (traits.accessory === 'rounds') {
      accSvg = `<circle cx="78" cy="88" r="15" fill="none" stroke="${acc.color}" stroke-width="6"/>`
             + `<circle cx="114" cy="88" r="15" fill="none" stroke="${acc.color}" stroke-width="6"/>`
             + r(92,86,8,4,acc.accent ?? '#E8A87C');
    } else if (traits.accessory === 'visor') {
      accSvg = r(56,76,80,16,hexA(acc.color,0.72));
    } else if (traits.accessory === 'phones') {
      accSvg = r(40,72,16,40,acc.color) + r(136,72,16,40,acc.color) + r(56,52,80,8,acc.color);
    } else if (traits.accessory === 'pin') {
      accSvg = r(112,132,12,12,acc.color);
    } else if (traits.accessory === 'star') {
      accSvg = r(124,48,8,24,acc.color) + r(116,56,24,8,acc.color);
    }

    return `<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
      <defs>
        <clipPath id="avatar-clip">
          <circle cx="96" cy="96" r="88"/>
        </clipPath>
      </defs>
      <g clip-path="url(#avatar-clip)">
        <circle cx="96" cy="96" r="88" fill="${hexA(backdrop,0.72)}"/>
        <circle cx="96" cy="96" r="86" fill="${hexA('#08090f',0.18)}"/>
        <circle cx="96" cy="96" r="76" fill="${hexA(backdrop,0.46)}"/>
        <g shape-rendering="crispEdges">
          ${r(48,128,96,40,outfit)}
          ${r(56,120,80,24,outfit)}
          ${r(72,116,48,16,skin)}
          ${r(64,56,64,64,skin)}
          ${r(56,72,16,32,skin)}
          ${r(120,72,16,32,skin)}
          ${hairSvg}
          ${eyesSvg}
          ${r(88,104,16,6,hexA('#08090f',0.54))}
          ${r(72,132,48,8,hexA('#08090f',0.16))}
          ${accSvg}
        </g>
      </g>
    </svg>`;
  };
})();
