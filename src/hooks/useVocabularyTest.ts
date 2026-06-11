import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BLOCK_SIZE,
  TOTAL_QUESTIONS,
  buildQuestion,
  correctCountsByBlock,
  getDiagnosticWords,
  levelFromScore,
  scoreFromAnswers,
  selectBlockWords,
  tierForBlock,
} from '../lib/vocabularyTest';
import { getAllWords } from '../lib/wordRepository';
import { saveVocabTestResult } from '../lib/storage';
import type {
  LevelTier,
  MasterWord,
  VocabTestAnswer,
  VocabTestQuestion,
  VocabTestResult,
} from '../types';

type Status = 'loading' | 'ready' | 'in_progress' | 'done' | 'error';

interface UseVocabularyTestReturn {
  status: Status;
  errorMessage: string | null;
  index: number;
  total: number;
  currentBlock: 0 | 1 | 2;
  currentTier: LevelTier;
  question: VocabTestQuestion | null;
  answers: VocabTestAnswer[];
  result: VocabTestResult | null;
  answer: (choiceIndex: number) => void;
  reset: () => void;
}

/**
 * 30-question adaptive TOEIC vocabulary diagnostic. Blocks of 10; the tier of
 * each subsequent block is chosen from the previous block's score.
 */
export function useVocabularyTest(): UseVocabularyTestReturn {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pool, setPool] = useState<MasterWord[]>([]);
  const [questions, setQuestions] = useState<VocabTestQuestion[]>([]);
  const [answers, setAnswers] = useState<VocabTestAnswer[]>([]);
  const [result, setResult] = useState<VocabTestResult | null>(null);
  const usedRef = useRef<Set<string>>(new Set());
  // Full 1000-word pool used ONLY for distractors, plus the set of diagnostic
  // word ids to exclude from distractors (so "I just saw it" can't be the tell).
  const distractorPoolRef = useRef<MasterWord[]>([]);
  const excludeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      try {
        const [fetched, allWords] = await Promise.all([
          getDiagnosticWords(),
          getAllWords().catch(() => [] as MasterWord[]),
        ]);
        if (cancelled) return;
        // Distractors come from the full pool (fallback to the diagnostic set
        // if the full pool is unavailable). Exclude the 30 diagnostic words.
        excludeIdsRef.current = new Set(
          (Array.isArray(fetched) ? fetched : []).map((w) => w.id)
        );
        distractorPoolRef.current =
          Array.isArray(allWords) && allWords.length > 0 ? allWords : fetched;
        if (
          !fetched ||
          !Array.isArray(fetched) ||
          fetched.length < BLOCK_SIZE
        ) {
          console.warn(
            '[vocabTest] diagnostic pool too small or null',
            fetched?.length
          );
          setErrorMessage(
            '診断用の単語が十分にありません。後ほどお試しください。'
          );
          setStatus('error');
          return;
        }
        setPool(fetched);
        usedRef.current = new Set();
        const firstBlock = selectBlockWords(
          'intermediate',
          fetched,
          usedRef.current,
          BLOCK_SIZE
        );
        if (!firstBlock || firstBlock.length === 0) {
          setErrorMessage('診断問題の生成に失敗しました。');
          setStatus('error');
          return;
        }
        firstBlock.forEach((w) => usedRef.current.add(w.id));
        setQuestions(
          firstBlock.map((w) =>
            buildQuestion(w, distractorPoolRef.current, excludeIdsRef.current)
          )
        );
        setAnswers([]);
        setResult(null);
        setStatus('in_progress');
      } catch (e) {
        if (cancelled) return;
        console.error('[vocabTest] init failed', e);
        setErrorMessage(e instanceof Error ? e.message : '読み込みエラー');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const index = answers.length;
  const currentBlock = Math.min(2, Math.floor(index / BLOCK_SIZE)) as 0 | 1 | 2;

  useEffect(() => {
    if (status !== 'in_progress') return;
    if (index === 0) return;
    if (index >= TOTAL_QUESTIONS) return;
    if (index % BLOCK_SIZE !== 0) return;
    if (questions.length > index) return;

    const counts = correctCountsByBlock(answers);
    const nextBlockIndex = (index / BLOCK_SIZE) as 0 | 1 | 2;
    const tier = tierForBlock(nextBlockIndex, counts);
    const block = selectBlockWords(tier, pool, usedRef.current, BLOCK_SIZE);
    block.forEach((w) => usedRef.current.add(w.id));
    setQuestions((prev) =>
      prev.concat(
        block.map((w) =>
          buildQuestion(w, distractorPoolRef.current, excludeIdsRef.current)
        )
      )
    );
  }, [index, status, answers, pool, questions.length]);

  useEffect(() => {
    if (status !== 'in_progress') return;
    // Finish only after all 30 questions are answered. (The previous
    // "exhausted" short-circuit fired at every block boundary: when
    // answers.length hit 10/20 the block-extend effect had not yet committed
    // its setQuestions, so questions.length still read 10/20 and the test
    // ended one block early — scoring just the 10 intermediate questions = 20.)
    if (answers.length < TOTAL_QUESTIONS) return;
    const score = scoreFromAnswers(answers);
    const level = levelFromScore(score);
    const r: VocabTestResult = {
      score,
      level,
      answers,
      completed_at: new Date().toISOString(),
    };
    setResult(r);
    setStatus('done');
    saveVocabTestResult(r).catch((e) =>
      console.warn('[vocabTest] save failed', e)
    );
  }, [answers, status]);

  const question =
    Array.isArray(questions) && index >= 0 && index < questions.length
      ? questions[index] ?? null
      : null;
  const currentTier: LevelTier = question?.tier ?? 'intermediate';

  const answer = useCallback(
    (choiceIndex: number) => {
      if (status !== 'in_progress') return;
      if (!Array.isArray(questions)) return;
      const q = questions[answers.length];
      if (!q || !q.word || !q.word.id) return;
      const correct = choiceIndex === q.correctIndex;
      setAnswers((prev) =>
        prev.concat({ wordId: q.word.id, tier: q.tier, correct })
      );
    },
    [answers.length, questions, status]
  );

  const reset = useCallback(() => {
    usedRef.current = new Set();
    setAnswers([]);
    setQuestions([]);
    setResult(null);
    setStatus('loading');
    if (pool.length >= BLOCK_SIZE) {
      const firstBlock = selectBlockWords(
        'intermediate',
        pool,
        usedRef.current,
        BLOCK_SIZE
      );
      firstBlock.forEach((w) => usedRef.current.add(w.id));
      setQuestions(
        firstBlock.map((w) =>
          buildQuestion(w, distractorPoolRef.current, excludeIdsRef.current)
        )
      );
      setStatus('in_progress');
    }
  }, [pool]);

  return useMemo(
    () => ({
      status,
      errorMessage,
      index,
      total: TOTAL_QUESTIONS,
      currentBlock,
      currentTier,
      question,
      answers,
      result,
      answer,
      reset,
    }),
    [
      status,
      errorMessage,
      index,
      currentBlock,
      currentTier,
      question,
      answers,
      result,
      answer,
      reset,
    ]
  );
}
