'use strict';
const numeral_literal = process.argv[2];

const numeral_base_10_map = {
    "I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000,
};

const token_types = {
    DIGIT: "digit", 
    OPERATOR: "operator",
    L_PARENS: "l_parens",
    R_PARENS: "r_parens",
};

// Operator precedence borrowed from JS specifications as outlined on MDN; however, at this stage, 
// any "precedence" value is arbitrary to some degree as long as the correct precedents are shared.
// As we aren't doing anything sophisticated (necessarily) with operators, only existing assoc. is
// "left".
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
const operator_precedence_map = {
    "(": { 
        precedence: 21,
    }, 
    ")": { 
        precedence: 21,
    },
    "*": {
        associativity: "left",
        precedence: 15,
    }, 
    "/": {
        associativity: "left",
        precedence: 15,
    }, 
     "+": { 
        associativity: "left", 
        precedence: 14,
    }, 
    "-": {
        associativity: "left",
        precedence: 14,
     },
     MINIMUM_PRECEDENCE: 14,
};

const is_number = (character) => {
    return /\d/.test(character);
};

const is_operator = (character) => {
    return /\+|-|\*|\/|\^/.test(character);
};

const is_left_parens = (ch) => {
	return /\(/.test(ch);
};

const is_right_parens = (ch) => {
	return /\)/.test(ch);
};

const precedence = (token) => {
    return operator_precedence_map[token.value].precedence;
};

const associativity = (token) => {
    return operator_precedence_map[token.value].associativity;
}

const peek = (arr) => {
    // not as "sexy" as slice(-1)[0] but faster: https://jsperf.com/last-array-element2
    return arr[arr.length - 1];
} 

const assign_token_type = (character) => {
    const token = { value: character, };
    
    // can care about a lesser set of things (no "." as we are dealing with ints)
    if (is_number(character)) { 
        token.type = token_types.DIGIT;
    } else if (is_operator(character)) {
        token.type = token_types.OPERATOR;
    } else if (is_left_parens(character)) {
        token.type = token_types.L_PARENS;
    } else if (is_right_parens(character)) {
        token.type = token_types.R_PARENS;
    }

    return token;
};

const tokenize = (base_10_expression_literal) => {
    const tokens = [];
    const base_10_buffer = []; // https://mattsnider.com/use-a-string-buffer-for-better-performance/
    const token_candidates = base_10_expression_literal.replace(/\s+/g, "").split(""); // remove white space; convert to array of token "candidates" (uninterpreted characters)

    token_candidates.forEach((character, index) => {
        const token = assign_token_type(character);

        switch (token.type) {
            case token_types.DIGIT:
                base_10_buffer.push(token.value); 
                break;
            case token_types.OPERATOR:
                collectAndResetNumberBuffer();
                tokens.push(token);
                break;
            case token_types.L_PARENS:
            case token_types.R_PARENS:
                collectAndResetNumberBuffer();
                tokens.push(token);
                break;
            default:
                throw new Error("token type unaccounted for.");
                break;
        }

        if (tokens.length) {
            collectAndResetNumberBuffer();
        }
    });

    // Using function for the sake of hoisting within the tokenize function's
    // execution context; just keeps the "need-to-know" a bit cleaner
    function collectAndResetNumberBuffer() {
        if (base_10_buffer.length) {
            tokens.push({
                type: token_types.DIGIT,
                value: base_10_buffer.join(""),
            });
            
            base_10_buffer.length = 0;
        }
    }

    return tokens;
};

const parse = (tokens) => {
    const operators = []; // stack
    const output = []; // queue

    tokens.forEach((token) => {
        // do something ...
    });

};

const convert_numeral_to_base_10 = (numeral) => {
    // could also throw a call to is_recognized_numeral in here
    if (typeof numeral !== "string") {
        throw new Error(`type of numeral:${typeof numeral}: does not match expected type string`);
    }
    const numeral_symbols = numeral.split("");
    let base_10_value = 0;

    numeral_symbols.forEach((value, index, array) => {
        // this syntax is a little gross; effectively it's saying {"I"} where "I" 
        //is the value of array at index +1
        const next_base_10_value = numeral_base_10_map[array[index + 1]];
        const current_base_10_value = numeral_base_10_map[array[index]];
        
        // if the current value being evaluated is _less_ than that after it, we know it is used 
        // as a "subtractor"; otherwise, we know it is a contributor to the overall total - even
        // in cases, e.g. of [L->I] comparison in [XLIX]; or [X->I]; [I->] in [XIII]
        if (current_base_10_value < next_base_10_value) {
            base_10_value -= current_base_10_value;
        } else {
            base_10_value += current_base_10_value;
        }
    });

    return base_10_value;
};

const is_recognized_numeral = (numeral) => {
    // no repeats? 
};

const ts = tokenize(numeral_literal);
console.log(ts);

// does class conversion help?
// it does if we are running a console app that is running in the engine, yeah, because there is a defined structure
// push into expression array
// evaluate pemdas