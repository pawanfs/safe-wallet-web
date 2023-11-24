import useDebounce from '@/hooks/useDebounce'
import { Box } from '@mui/material'
import { createRef, type FormEvent, useState, useEffect, type ClipboardEvent } from 'react'
import css from './styles.module.css'

const digitRegExp = /^[0-9]$/
const useCodeInput = (length: number, onCodeChanged: (code: string) => void) => {
  const [code, setCode] = useState(Array.from(new Array(length)).map(() => ''))

  const [inputRefsArray] = useState(() => Array.from({ length }, () => createRef<HTMLInputElement>()))

  const handleChange = (digit: string, index: number) => {
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    if (digit.length === 1) {
      // set focus to next element
      if (index + 1 < length) {
        inputRefsArray[index + 1].current?.focus()
      }
    } else {
      // Go to previous element
      if (index > 0) {
        inputRefsArray[index - 1].current?.focus()
      }
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    let input = event.clipboardData?.getData('text')
    if (!input) {
      return
    }
    const trimmedInput = input.trim()
    if (trimmedInput.length === length) {
      const newCode = trimmedInput.split('')
      if (!newCode.some((digit) => !digitRegExp.test(digit))) {
        setCode(newCode)
      }
    }
  }

  const debouncedCode = useDebounce(code, 100)

  useEffect(() => {
    // Submit input if complete and valid
    if (!debouncedCode.some((digit) => !digitRegExp.test(digit))) {
      // There is no character that's not a digit, we invoke the callback
      onCodeChanged(debouncedCode.join(''))
    } else {
      onCodeChanged('')
    }
  }, [debouncedCode, onCodeChanged])

  return { code, handleChange, handlePaste, inputRefsArray }
}

const CodeInput = ({ length, onCodeChanged }: { length: number; onCodeChanged: (code: string) => void }) => {
  const { code, handleChange, handlePaste, inputRefsArray } = useCodeInput(length, onCodeChanged)
  // create a array of refs
  const onInput = (event: FormEvent<HTMLInputElement>, index: number) => {
    const value = event.currentTarget.value
    handleChange(value, index)
  }

  const onFocus = (event: FormEvent<HTMLInputElement>) => {
    event.currentTarget.select()
  }

  return (
    <Box display="inline-flex" gap={2}>
      {inputRefsArray.map((ref, idx) => (
        <input
          className={css.codeDigit}
          value={code[idx]}
          ref={ref}
          onFocus={onFocus}
          onPaste={handlePaste}
          onInput={(event) => onInput(event, idx)}
          key={idx}
          maxLength={1}
        />
      ))}
    </Box>
  )
}

export default CodeInput