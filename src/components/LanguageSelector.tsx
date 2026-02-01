import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Language {
    code: string;
    name: string;
    flagCode: string;
}

const LANGUAGES: Language[] = [
    { code: 'en', name: 'English', flagCode: 'us' },
    { code: 'es', name: 'Spanish', flagCode: 'es' },
    { code: 'fr', name: 'French', flagCode: 'fr' },
    { code: 'de', name: 'German', flagCode: 'de' },
    { code: 'sv', name: 'Swedish', flagCode: 'se' },
    { code: 'ar', name: 'Arabic', flagCode: 'sa' },
    { code: 'ru', name: 'Russian', flagCode: 'ru' },
    { code: 'kk', name: 'Kazakh', flagCode: 'kz' },
];

const LanguageSelector: React.FC = () => {
    const { i18n } = useTranslation();
    const { isDarkMode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

    // Update button position when dropdown opens
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setButtonPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right
            });
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                buttonRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(code);
        setIsOpen(false);

        document.documentElement.lang = code;

        if (code === 'ar') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${isDarkMode
                    ? 'text-purple-200 hover:bg-purple-600/50 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                aria-label="Select language"
                aria-expanded={isOpen}
            >
                <Languages className="w-4 h-4" />
                <img
                    src={`https://flagcdn.com/24x18/${currentLanguage.flagCode}.png`}
                    srcSet={`https://flagcdn.com/48x36/${currentLanguage.flagCode}.png 2x,
                   https://flagcdn.com/72x54/${currentLanguage.flagCode}.png 3x`}
                    alt={currentLanguage.name}
                    className="hidden sm:inline w-6 h-auto rounded-sm"
                />
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className={`fixed w-[280px] sm:w-[380px] rounded-2xl shadow-2xl border ${isDarkMode
                            ? 'bg-gray-900/95 backdrop-blur-xl border-purple-400/30'
                            : 'bg-white/95 backdrop-blur-xl border-gray-200/50'
                        }`}
                    style={{
                        top: `${buttonPosition.top}px`,
                        left: window.innerWidth < 640 ? '50%' : 'auto',
                        right: window.innerWidth >= 640 ? `${buttonPosition.right}px` : 'auto',
                        transform: window.innerWidth < 640 ? 'translateX(-50%)' : 'none',
                        zIndex: 999999,
                        maxWidth: 'calc(100vw - 2rem)'
                    }}
                >
                    <div className={`flex items-center gap-3 px-5 py-4 border-b ${isDarkMode ? 'border-purple-400/20' : 'border-gray-200'
                        }`}>
                        <Languages className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                        <h3 className={`text-base font-bold ${isDarkMode ? 'text-purple-50' : 'text-gray-900'
                            }`}>
                            Select Language
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                        {LANGUAGES.map((language) => {
                            const isSelected = language.code === currentLanguage.code;

                            return (
                                <button
                                    key={language.code}
                                    onClick={() => handleLanguageChange(language.code)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isSelected
                                        ? isDarkMode
                                            ? 'bg-purple-500/30 border-2 border-purple-400'
                                            : 'bg-purple-100 border-2 border-purple-500'
                                        : isDarkMode
                                            ? 'bg-gray-800/50 border-2 border-transparent hover:bg-purple-500/20 hover:border-purple-400/50'
                                            : 'bg-gray-50 border-2 border-transparent hover:bg-purple-50 hover:border-purple-300'
                                        }`}
                                >
                                    <img
                                        src={`https://flagcdn.com/24x18/${language.flagCode}.png`}
                                        srcSet={`https://flagcdn.com/48x36/${language.flagCode}.png 2x,
                             https://flagcdn.com/72x54/${language.flagCode}.png 3x`}
                                        alt={language.name}
                                        className="w-8 h-auto rounded-sm shadow-sm"
                                    />
                                    <div className="flex-1 text-left">
                                        <div className={`text-sm font-bold ${isDarkMode ? 'text-purple-50' : 'text-gray-900'
                                            }`}>
                                            {language.name}
                                        </div>
                                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                            }`}>
                                            {language.code.toUpperCase()}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <Check className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'
                                            }`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default LanguageSelector;
