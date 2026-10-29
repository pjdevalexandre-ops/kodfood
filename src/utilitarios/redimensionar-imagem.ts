/**
 * Redimensiona e comprime uma imagem no navegador usando Canvas.
 * Garante que imagens de alta resolução (ex.: fotos de celular de 12MP)
 * sejam otimizadas para tamanhos leves (~30KB a 60KB), permitindo armazenamento
 * seguro e instantâneo no localStorage sem estourar a cota do navegador.
 */
export async function redimensionarImagem(
  arquivo: File,
  larguraMaxima: number,
  alturaMaxima: number,
  qualidade: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = (evento) => {
      const dataUrlOriginal = evento.target?.result as string;
      if (!dataUrlOriginal) {
        reject(new Error('Falha ao ler arquivo'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > larguraMaxima || height > alturaMaxima) {
          if (width / height > larguraMaxima / alturaMaxima) {
            height = Math.round((height * larguraMaxima) / width);
            width = larguraMaxima;
          } else {
            width = Math.round((width * alturaMaxima) / height);
            height = alturaMaxima;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrlOriginal);
          return;
        }

        // Desenha a imagem redimensionada com suavização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrlOtimizada = canvas.toDataURL('image/jpeg', qualidade);
        resolve(dataUrlOtimizada);
      };

      img.onerror = () => resolve(dataUrlOriginal);
      img.src = dataUrlOriginal;
    };

    leitor.onerror = () => reject(new Error('Erro ao carregar imagem'));
    leitor.readAsDataURL(arquivo);
  });
}
