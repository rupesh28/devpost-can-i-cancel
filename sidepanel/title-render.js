// panel.js
export function renderTitleStylePanel(renderEl, renderText) {
  const panel = document.getElementById(renderEl);
  panel.innerHTML = `
    <style>
      .font-z { font-family:"Bebas Neue",sans-serif; }
      .font-z-script { font-family:"Pacifico",cursive; }
      .shadow-z { text-shadow:3px 3px 0 #e23b2d, 5px 5px 0 rgba(0,0,0,.1); }
    </style>
    <div class="flex items-center justify-center bg-[#2C3E50] h-40">
      <div class="text-center">
        <h1 class="font-z uppercase tracking-[-0.04em] leading-none shadow-z
                   text-[clamp(48px,12vw,140px)] text-[#f9c700]">
          ${renderText}
        </h1>
        <p class="mt-2 font-z-script text-[clamp(16px,3vw,32px)] text-white/90">
          Lets find out!!
        </p>
      </div>
    </div>`;
}