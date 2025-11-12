import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Spinner } from './components/Spinner';
import { generateImage, generateBottleAngles } from './services/geminiService';
import type { UploadedImage } from './types';

// --- ICONS ---
const BottleIcon = () => ( <svg className="w-10 h-10 mb-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.5 12l-.638 4.471m-2.724-4.471L9 12m0 0l-1.016-7.11a2 2 0 011.984-2.223h4.064a2 2 0 011.984 2.223L15 12m-6 0h6m-1-7h.01M10 5h.01M12 21a9 9 0 110-18 9 9 0 010 18z"></path></svg> );
const SceneIcon = () => ( <svg className="w-10 h-10 mb-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> );
const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg> );

type GenerationMode = 'simple' | 'complex';
type ComplexPhase = 'angles' | 'scene';

const App: React.FC = () => {
    // Shared State
    const [spiritImage, setSpiritImage] = useState<UploadedImage | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Mode State
    const [generationMode, setGenerationMode] = useState<GenerationMode>('simple');
    const [complexPhase, setComplexPhase] = useState<ComplexPhase>('angles');
    
    // Simple Mode State
    const [sceneImage, setSceneImage] = useState<UploadedImage | null>(null);
    const [styleImages, setStyleImages] = useState<UploadedImage[]>([]);
    const [isStyleReferenceOnly, setIsStyleReferenceOnly] = useState<boolean>(false);

    // Complex Mode State
    const [generatedAngles, setGeneratedAngles] = useState<UploadedImage[]>([]);
    const [isGeneratingAngles, setIsGeneratingAngles] = useState<boolean>(false);

    // Output State
    const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
    const [isGeneratingScene, setIsGeneratingScene] = useState<boolean>(false);


    const handleGenerateAngles = async () => {
        if (!spiritImage) {
            setError('Please upload a packshot first.');
            return;
        }
        setIsGeneratingAngles(true);
        setError(null);
        setGeneratedAngles([]);

        try {
            const resultBase64Array = await generateBottleAngles(spiritImage);
            // We need mime type for the next step
            const anglesWithMime: UploadedImage[] = resultBase64Array.map(base64 => ({ base64, mimeType: 'image/png' }));
            setGeneratedAngles(anglesWithMime);
            setComplexPhase('scene');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsGeneratingAngles(false);
        }
    };

    const handleGenerateScene = async () => {
        const objectImages = generationMode === 'complex' ? [spiritImage!, ...generatedAngles] : [spiritImage!];
        const referenceData = isStyleReferenceOnly ? styleImages : (sceneImage ? [sceneImage] : []);

        if (objectImages.some(img => !img) || referenceData.length === 0) {
            setError('Please ensure all required images are uploaded.');
            return;
        }

        setIsGeneratingScene(true);
        setError(null);
        setGeneratedImages(null);

        try {
            const resultBase64Array = await generateImage(referenceData, objectImages, prompt, isStyleReferenceOnly);
            setGeneratedImages(resultBase64Array);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsGeneratingScene(false);
        }
    };

    const handleAddStyleImage = (image: UploadedImage | null) => {
        if (image) setStyleImages(prev => [...prev, image]);
    };

    const handleRemoveStyleImage = (indexToRemove: number) => {
        setStyleImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleResetComplex = () => {
        setComplexPhase('angles');
        setGeneratedAngles([]);
        setSceneImage(null);
        setStyleImages([]);
        setPrompt('');
        setGeneratedImages(null);
        setError(null);
    };

    // --- RENDER FUNCTIONS ---

    const renderAngleGeneration = () => (
        <>
            <div>
                <h2 className="text-xl font-semibold text-zinc-200 border-b border-zinc-800 pb-4 mb-4">1. Upload Packshot</h2>
                <ImageUploader id="spirit-bottle" label="Packshot Bottle" onImageUpload={setSpiritImage} icon={<BottleIcon />} />
            </div>
            <button
                onClick={handleGenerateAngles}
                disabled={!spiritImage || isGeneratingAngles}
                className="w-full py-3 px-6 text-md font-semibold text-zinc-900 bg-zinc-200 rounded-lg hover:bg-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isGeneratingAngles ? 'Generating Angles...' : '✨ Generate Angles'}
            </button>
        </>
    );

    const renderSceneGeneration = () => {
        const isGenerateDisabled = isGeneratingScene || !spiritImage || (isStyleReferenceOnly ? styleImages.length === 0 : !sceneImage);
        return (
            <>
                {generationMode === 'simple' && (
                    <div>
                         <h2 className="text-xl font-semibold text-zinc-200 border-b border-zinc-800 pb-4 mb-4">1. Upload Packshot</h2>
                        <ImageUploader id="spirit-bottle-simple" label="Packshot Bottle" onImageUpload={setSpiritImage} icon={<BottleIcon />} />
                    </div>
                )}
                {generationMode === 'complex' && complexPhase === 'scene' && (
                     <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
                        <h2 className="text-xl font-semibold text-zinc-200">2. Upload Scene</h2>
                        <button onClick={handleResetComplex} className="text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md px-3 py-1.5 transition-colors">
                            &larr; Start Over
                        </button>
                    </div>
                )}

                 <div>
                    {generationMode === 'simple' && <h2 className="text-xl font-semibold text-zinc-200 border-b border-zinc-800 pb-4 mb-4">2. Choose Generation Mode</h2>}
                    <div className="flex items-center p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
                        <input type="checkbox" id="style-mode-checkbox" checked={isStyleReferenceOnly} onChange={(e) => setIsStyleReferenceOnly(e.target.checked)} className="w-5 h-5 text-zinc-300 bg-zinc-800 border-zinc-600 rounded focus:ring-zinc-500 focus:ring-2 cursor-pointer" />
                        <label htmlFor="style-mode-checkbox" className="ml-3 text-sm font-medium text-zinc-300 cursor-pointer">
                            Use reference as style only
                            <p className="text-xs text-zinc-500 mt-1">Generates a new scene in the same style, instead of swapping the bottle.</p>
                        </label>
                    </div>
                </div>
                 <div>
                    <h2 className="text-xl font-semibold text-zinc-200 border-b border-zinc-800 pt-8 pb-4 mb-4">{isStyleReferenceOnly ? "3. Upload Style References" : "3. Upload Reference Scene"}</h2>
                    {isStyleReferenceOnly ? (
                        <div className="flex flex-col gap-4">
                            {styleImages.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {styleImages.map((image, index) => (
                                        <div key={index} className="relative group aspect-square">
                                            <img src={`data:image/png;base64,${image.base64}`} alt={`Style ref ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                            <button onClick={() => handleRemoveStyleImage(index)} className="absolute top-1 right-1 bg-zinc-900/60 backdrop-blur-sm text-zinc-200 rounded-full p-1 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110" aria-label="Remove style image">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <ImageUploader key={`style-uploader-${styleImages.length}`} id="style-image-uploader" label="Add Style Reference" onImageUpload={handleAddStyleImage} icon={<SceneIcon />} />
                        </div>
                    ) : (
                        <ImageUploader id="reference-image" label="Reference Scene (with bottle)" onImageUpload={setSceneImage} icon={<SceneIcon />} />
                    )}
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-zinc-200 border-b border-zinc-800 pb-4 mb-4 pt-8">4. Optional: Add Details</h2>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 'Make the lighting warmer...'" className="w-full h-32 p-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 transition-colors" />
                </div>
                <button onClick={handleGenerateScene} disabled={isGenerateDisabled} className="w-full py-3 px-6 text-md font-semibold text-zinc-900 bg-zinc-200 rounded-lg hover:bg-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
                    {isGeneratingScene ? 'Generating...' : '✨ Generate Creations'}
                </button>
            </>
        )
    };
    
    const renderOutput = () => (
        <div className="flex flex-col items-center justify-center p-8 bg-[#1A1B1E] rounded-xl border border-zinc-800 min-h-[400px] lg:min-h-0">
            <h2 className="text-xl font-semibold text-zinc-200 w-full text-center border-b border-zinc-800 pb-4 mb-4">
                {isGeneratingAngles ? "Generated Angles" : "Your Creations"}
            </h2>
            <div className="flex-grow flex items-center justify-center w-full bg-black/20 rounded-lg overflow-hidden p-2 md:p-4">
                {(isGeneratingScene || isGeneratingAngles) && <Spinner />}
                {error && <div className="p-4 text-red-400 text-center border border-red-500/50 rounded-lg"><strong>Error:</strong> {error}</div>}
                
                {generatedImages && !isGeneratingScene && (
                    <div className="grid grid-cols-2 gap-2 md:gap-4 w-full h-full">
                        {generatedImages.map((imageBase64, index) => (
                            <div key={index} className="relative group aspect-square bg-black/30 rounded-lg">
                                <img src={`data:image/png;base64,${imageBase64}`} alt={`Generated scene ${index + 1}`} className="w-full h-full object-contain rounded-lg shadow-lg" />
                                <a href={`data:image/png;base64,${imageBase64}`} download={`bottle-swap-${index + 1}.png`} className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-zinc-900/60 backdrop-blur-sm text-zinc-100 py-1.5 px-3 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-105 focus:opacity-100" aria-label={`Download image ${index + 1}`}>
                                    <DownloadIcon /> <span className="text-xs font-medium hidden sm:inline">Download</span>
                                </a>
                            </div>
                        ))}
                    </div>
                )}

                 {generatedAngles.length > 0 && complexPhase === 'scene' && !generatedImages && !isGeneratingScene && (
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
                        <div className="md:col-span-1 relative aspect-square bg-black/30 rounded-lg border-2 border-zinc-700">
                           <img src={`data:${spiritImage?.mimeType};base64,${spiritImage?.base64}`} alt="Original Packshot" className="w-full h-full object-contain rounded-lg p-1" />
                           <div className="absolute bottom-1 left-1 text-xs bg-zinc-900/70 text-zinc-300 px-2 py-0.5 rounded">Original</div>
                        </div>
                        {generatedAngles.map((image, index) => (
                           <div key={index} className="relative aspect-square bg-black/30 rounded-lg">
                              <img src={`data:image/png;base64,${image.base64}`} alt={`Generated angle ${index + 1}`} className="w-full h-full object-contain rounded-lg" />
                           </div>
                        ))}
                     </div>
                 )}

                {!isGeneratingScene && !isGeneratingAngles && !error && !generatedImages && complexPhase === 'angles' && (
                    <p className="text-zinc-500 text-center">Your generated images will appear here.</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="text-zinc-200 min-h-screen font-sans">
            <header className="py-6 bg-[#111214]/80 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-10">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-zinc-100">Bottle Swap Studio</h1>
                    <p className="mt-2 text-lg text-zinc-400">Powered by Gemini Nano Banana 🍌</p>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8">
                <div className="max-w-md mx-auto mb-8">
                     <div className="relative flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                        <button onClick={() => setGenerationMode('simple')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${generationMode === 'simple' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}`}>Simple Generation</button>
                        <button onClick={() => setGenerationMode('complex')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${generationMode === 'complex' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}`}>Complex Generation</button>
                        <div className="absolute top-1 bottom-1 bg-zinc-200 rounded-md transition-all duration-300 ease-in-out" style={{ width: 'calc(50% - 4px)', left: generationMode === 'simple' ? '4px' : 'calc(50% + 0px)' }}></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-8 p-8 bg-[#1A1B1E] rounded-xl border border-zinc-800">
                        {generationMode === 'complex' && complexPhase === 'angles' && renderAngleGeneration()}
                        {generationMode === 'simple' || (generationMode === 'complex' && complexPhase === 'scene') ? renderSceneGeneration() : null}
                    </div>
                    {renderOutput()}
                </div>
            </main>
        </div>
    );
};

export default App;