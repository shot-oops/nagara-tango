import React, { useEffect, useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { OnboardingSlides } from './OnboardingSlides';
import { ToeicScoreScreen } from './ToeicScoreScreen';
import { Step2Sort } from './Step2Sort';
import { Step3Settings } from './Step3Settings';
import { useApp } from '../../context/AppContext';
import { getSlidesSeen, saveProfile, saveVocabTestResult, setSlidesSeen } from '../../lib/storage';
import type { VocabLevel } from '../../types';

type Phase = 'welcome' | 'slides' | 'score' | 'test' | 'settings';

/**
 * Onboarding: welcome → intro slides (once) → TOEIC score check →
 * diagnostic test (first-timers) OR skip (score entered) → settings.
 */
export function OnboardingFlow() {
  const ctx = useApp();
  const [slidesSeen, setSlidesSeenState] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('welcome');

  useEffect(() => {
    getSlidesSeen()
      .then((seen) => {
        setSlidesSeenState(seen);
        if (seen) setPhase('score');
      })
      .catch(() => setSlidesSeenState(true));
  }, []);

  const plan = ctx && ctx.profile && ctx.profile.plan ? ctx.profile.plan : 'free';

  if (slidesSeen === null) return null;

  if (phase === 'welcome') {
    return <WelcomeScreen onStart={() => setPhase('slides')} />;
  }

  if (phase === 'slides') {
    return (
      <OnboardingSlides
        onDone={() => {
          setSlidesSeen().catch(() => {});
          setSlidesSeenState(true);
          setPhase('score');
        }}
      />
    );
  }

  if (phase === 'score') {
    return (
      <ToeicScoreScreen
        onBack={() => setPhase(slidesSeen ? 'welcome' : 'slides')}
        onFirstTimer={async () => {
          await saveProfile({ toeic_experience: false }).catch(() => {});
          setPhase('test');
        }}
        onScored={async (level: VocabLevel, score: number) => {
          // Persist the self-reported score and synthesize a diagnostic
          // result so the rest of the app picks up the level immediately.
          await saveProfile({ toeic_experience: true, toeic_score: score }).catch(
            () => {}
          );
          await saveVocabTestResult({
            score,
            level,
            answers: [],
            completed_at: new Date().toISOString(),
          }).catch(() => {});
          setPhase('settings');
        }}
      />
    );
  }

  if (phase === 'test') {
    return <Step2Sort onNext={() => setPhase('settings')} />;
  }

  return <Step3Settings plan={plan} onDone={() => undefined} />;
}
