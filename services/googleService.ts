
// Service to handle Google Drive and Photos integration simulation

// Helper to create a dummy stamp image for simulation
export const createDummyStampFile = (sourceName: string): Promise<File> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Background
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, 0, 600, 400);
            
            // Stamp border
            ctx.strokeStyle = '#0f172a'; 
            ctx.lineWidth = 2;
            ctx.strokeRect(150, 50, 300, 300);
            
            // Perforations visual trick
            ctx.fillStyle = '#f1f5f9';
            for(let i=150; i<=450; i+=15) {
                ctx.beginPath(); ctx.arc(i, 50, 5, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(i, 350, 5, 0, Math.PI*2); ctx.fill();
            }
            for(let i=50; i<=350; i+=15) {
                ctx.beginPath(); ctx.arc(150, i, 5, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(450, i, 5, 0, Math.PI*2); ctx.fill();
            }

            // Design
            ctx.fillStyle = sourceName === 'Google Photos' ? '#ea4335' : '#4285f4';
            ctx.fillRect(170, 70, 260, 260);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(sourceName, 300, 180);
            ctx.font = '14px sans-serif';
            ctx.fillText('Sample Import', 300, 210);
        }

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `imported_${sourceName.toLowerCase().replace(' ', '_')}.png`, { type: 'image/png' });
                resolve(file);
            } else {
                 resolve(new File([""], "error.png", { type: "image/png" }));
            }
        }, 'image/png');
    });
};

export const exportToGoogleDrive = async (stamps: any[]) => {
    return new Promise<boolean>((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, 1500);
    });
};
