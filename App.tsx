import React, { useState, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Spinner } from './components/Spinner';
import { ToastContainer } from './components/Toast';
import { ImageModal } from './components/ImageModal';
import { ThemeToggle } from './components/ThemeToggle';
import { HistoryPanel } from './components/HistoryPanel';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { useGenerationHistory } from './hooks/useLocalStorage';
import { generateImage, generateBottleAngles } from './services/geminiService';
import { downloadImagesAsZip } from './utils/exportZip';
import type { UploadedImage } from './types';

// --- ICONS ---
const BottleIcon = () => ( <svg className="w-10 h-10 mb-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.5 12l-.638 4.471m-2.724-4.471L9 12m0 0l-1.016-7.11a2 2 0 011.984-2.223h4.064a2 2 0 011.984 2.223L15 12m-6 0h6m-1-7h.01M10 5h.01M12 21a9 9 0 110-18 9 9 0 010 18z"></path></svg> );
const SceneIcon = () => ( <svg className="w-10 h-10 mb-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> );
const DownloadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg> );

type GenerationMode = 'simple' | 'complex';
type ComplexPhase = 'angles' | 'scene';
type ProgressStatus = 'idle' | 'generating' | 'processing';

const App: React.FC = () => {
    // Toast notifications
    const { toasts, dismissToast, showSuccess, showError, showInfo } = useToast();

    // Theme
    const { theme, toggleTheme, isDark } = useTheme();

    // Generation History
    const { history, addToHistory, clearHistory, deleteEntry } = useGenerationHistory();

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

    // Progress tracking
    const [progressStatus, setProgressStatus] = useState<ProgressStatus>('idle');
    const [progressMessage, setProgressMessage] = useState<string>('');

    // Image modal
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

    // AbortController for cancellation
    const abortControllerRef = useRef<AbortController | null>(null);


    const handleCancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsGeneratingAngles(false);
            setIsGeneratingScene(false);
            setProgressStatus('idle');
            setProgressMessage('');
            showInfo('Generation cancelled');
        }
    };

    const handleGenerateAngles = async () => {
        if (!spiritImage) {
            showError('Please upload a packshot first.');
            return;
        }
        setIsGeneratingAngles(true);
        setError(null);
        setGeneratedAngles([]);
        setProgressStatus('generating');
        setProgressMessage('Generating 4 different bottle angles...');
        abortControllerRef.current = new AbortController();

        try {
            const resultBase64Array = await generateBottleAngles(spiritImage);
            // We need mime type for the next step
            const anglesWithMime: UploadedImage[] = resultBase64Array.map(base64 => ({ base64, mimeType: 'image/png' }));
            setGeneratedAngles(anglesWithMime);
            setComplexPhase('scene');
            showSuccess('Bottle angles generated successfully!');
            setProgressStatus('idle');
            setProgressMessage('');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            showError(errorMessage);
            setProgressStatus('idle');
            setProgressMessage('');
        } finally {
            setIsGeneratingAngles(false);
            abortControllerRef.current = null;
        }
    };

    const handleGenerateScene = async () => {
        const objectImages = generationMode === 'complex' ? [spiritImage!, ...generatedAngles] : [spiritImage!];
        const referenceData = isStyleReferenceOnly ? styleImages : (sceneImage ? [sceneImage] : []);

        if (objectImages.some(img => !img) || referenceData.length === 0) {
            showError('Please ensure all required images are uploaded.');
            return;
        }

        setIsGeneratingScene(true);
        setError(null);
        setGeneratedImages(null);
        setProgressStatus('generating');
        setProgressMessage('Analyzing scene and generating 4 variations...');
        abortControllerRef.current = new AbortController();

        try {
            const resultBase64Array = await generateImage(referenceData, objectImages, prompt, isStyleReferenceOnly);
            setGeneratedImages(resultBase64Array);

            // Add to history
            addToHistory(generationMode, resultBase64Array, prompt);

            showSuccess(`Successfully generated ${resultBase64Array.length} images!`);
            setProgressStatus('idle');
            setProgressMessage('');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            showError(errorMessage);
            setProgressStatus('idle');
            setProgressMessage('');
        } finally {
            setIsGeneratingScene(false);
            abortControllerRef.current = null;
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

    const handleDownloadAll = () => {
        if (!generatedImages || generatedImages.length === 0) return;

        generatedImages.forEach((imageBase64, index) => {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${imageBase64}`;
            link.download = `bottle-swap-${index + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        showSuccess(`Downloaded ${generatedImages.length} images!`);
    };

    const handleDownloadZip = async () => {
        if (!generatedImages || generatedImages.length === 0) return;

        try {
            await downloadImagesAsZip(generatedImages, 'bottle-swap-images');
            showSuccess('ZIP file downloaded successfully!');
        } catch (error) {
            showError('Failed to create ZIP file');
            console.error('ZIP download error:', error);
        }
    };

    const handleModeChange = (mode: GenerationMode) => {
        if (generationMode !== mode) {
            // Reset state when changing modes
            setGeneratedAngles([]);
            setGeneratedImages(null);
            setError(null);
            setComplexPhase('angles');
            setGenerationMode(mode);
            showInfo(`Switched to ${mode} mode`);
        }
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
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4 pt-8">
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-200">4. Optional: Add Details</h2>
                        <span className={`text-xs font-medium ${prompt.length > 500 ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-500'}`}>
                            {prompt.length}/1000
                        </span>
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => {
                            if (e.target.value.length <= 1000) {
                                setPrompt(e.target.value);
                            }
                        }}
                        placeholder="e.g., 'Make the lighting warmer...'"
                        maxLength={1000}
                        className="w-full h-32 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors text-zinc-900 dark:text-zinc-200"
                        aria-label="Additional prompt details"
                    />
                    <div className="mt-3">
                        <p className="text-xs text-zinc-500 mb-2">Quick suggestions:</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Warmer lighting',
                                'Cooler tones',
                                'More dramatic shadows',
                                'Softer background',
                                'Professional studio look',
                                'Natural outdoor setting'
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setPrompt(suggestion)}
                                    className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-md transition-colors border border-zinc-700 hover:border-zinc-600"
                                    type="button"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <button onClick={handleGenerateScene} disabled={isGenerateDisabled} className="w-full py-3 px-6 text-md font-semibold text-zinc-900 bg-zinc-200 rounded-lg hover:bg-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
                    {isGeneratingScene ? 'Generating...' : '✨ Generate Creations'}
                </button>
            </>
        )
    };
    
    const renderOutput = () => (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-[#1A1B1E] rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[400px] lg:min-h-0">
            <div className="flex justify-between items-center w-full border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-200">
                    {isGeneratingAngles ? "Generated Angles" : "Your Creations"}
                </h2>
                {generatedImages && generatedImages.length > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadZip}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                            aria-label="Download as ZIP"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
                                <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
                            </svg>
                            <span className="hidden sm:inline">ZIP</span>
                        </button>
                        <button
                            onClick={handleDownloadAll}
                            className="flex items-center gap-2 px-3 py-2 bg-zinc-600 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-100 dark:text-zinc-200 rounded-lg transition-colors text-sm font-medium"
                            aria-label="Download all images individually"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="hidden sm:inline">All</span>
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-grow flex flex-col items-center justify-center w-full bg-black/20 rounded-lg overflow-hidden p-2 md:p-4">
                {(isGeneratingScene || isGeneratingAngles) && (
                    <div className="flex flex-col items-center gap-4">
                        <Spinner />
                        {progressMessage && (
                            <p className="text-sm text-zinc-400 text-center animate-pulse">{progressMessage}</p>
                        )}
                        {abortControllerRef.current && (
                            <button
                                onClick={handleCancelGeneration}
                                className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg border border-red-500/50 transition-colors text-sm font-medium"
                            >
                                Cancel Generation
                            </button>
                        )}
                    </div>
                )}
                {error && <div className="p-4 text-red-400 text-center border border-red-500/50 rounded-lg"><strong>Error:</strong> {error}</div>}
                
                {generatedImages && !isGeneratingScene && (
                    <div className="grid grid-cols-2 gap-2 md:gap-4 w-full h-full">
                        {generatedImages.map((imageBase64, index) => (
                            <div key={index} className="relative group aspect-square bg-black/30 rounded-lg">
                                <img
                                    src={`data:image/png;base64,${imageBase64}`}
                                    alt={`Generated scene ${index + 1}`}
                                    className="w-full h-full object-contain rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setModalImageUrl(`data:image/png;base64,${imageBase64}`)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            setModalImageUrl(`data:image/png;base64,${imageBase64}`);
                                        }
                                    }}
                                />
                                <div className="absolute top-2 left-2 bg-zinc-900/60 backdrop-blur-sm text-zinc-300 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click to zoom
                                </div>
                                <a href={`data:image/png;base64,${imageBase64}`} download={`bottle-swap-${index + 1}.png`} className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-zinc-900/60 backdrop-blur-sm text-zinc-100 py-1.5 px-3 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-105 focus:opacity-100" aria-label={`Download image ${index + 1}`} onClick={(e) => e.stopPropagation()}>
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
        <div className="text-zinc-900 dark:text-zinc-200 min-h-screen font-sans bg-white dark:bg-[#111214] transition-colors">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            {modalImageUrl && (
                <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />
            )}

            <header className="py-6 bg-zinc-50/80 dark:bg-[#111214]/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1"></div>
                        <div className="text-center">
                            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Bottle Swap Studio</h1>
                            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Powered by Gemini Nano Banana 🍌</p>
                        </div>
                        <div className="flex-1 flex justify-end">
                            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8">
                <div className="max-w-md mx-auto mb-8">
                     <div className="relative flex p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg">
                        <div className="absolute top-1 bottom-1 bg-white dark:bg-zinc-200 rounded-md transition-all duration-300 ease-in-out shadow-sm" style={{ width: 'calc(50% - 4px)', left: generationMode === 'simple' ? '4px' : 'calc(50% + 0px)' }}></div>
                        <button onClick={() => handleModeChange('simple')} className={`relative z-10 w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${generationMode === 'simple' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`} aria-pressed={generationMode === 'simple'}>Simple Generation</button>
                        <button onClick={() => handleModeChange('complex')} className={`relative z-10 w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${generationMode === 'complex' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`} aria-pressed={generationMode === 'complex'}>Complex Generation</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-8 p-8 bg-zinc-50 dark:bg-[#1A1B1E] rounded-xl border border-zinc-200 dark:border-zinc-800">
                        {generationMode === 'complex' && complexPhase === 'angles' && renderAngleGeneration()}
                        {generationMode === 'simple' || (generationMode === 'complex' && complexPhase === 'scene') ? renderSceneGeneration() : null}
                    </div>
                    {renderOutput()}
                </div>
            </main>

            <HistoryPanel
                history={history}
                onClearHistory={() => {
                    clearHistory();
                    showSuccess('History cleared');
                }}
                onDeleteEntry={(id) => {
                    deleteEntry(id);
                    showInfo('Entry deleted');
                }}
                onImageClick={(imageUrl) => setModalImageUrl(imageUrl)}
            />
        </div>
    );
};

export default App;