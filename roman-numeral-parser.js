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
const operator_precedence_and_evaluator_map = {
    "*": {
        associativity: "left",
        precedence: 15,
        evaluate: function (x, y) {
            return Number(x) * Number(y);
        },
    }, 
    "/": {
        associativity: "left",
        precedence: 15,
        evaluate: function (x, y) {
            return Number(x) / Number(y);
        },
    }, 
     "+": { 
        associativity: "left", 
        precedence: 14,
        evaluate: function (x, y) {
            return Number(x) + Number(y);
        },
    }, 
    "-": {
        associativity: "left",
        precedence: 14,
        evaluate: function (x, y) {
            return Number(x) - Number(y);
        },
     },
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
    return operator_precedence_and_evaluator_map[token.value].precedence;
};

const associativity = (token) => {
    return operator_precedence_and_evaluator_map[token.value].associativity;
}

// peek and add_node could have been assigned to the array prototype for better readability in 
// code making use of the two functions, below. For the sake of time I didn't do this clean up.
const peek = (arr) => {
    // not as "sexy" as slice(-1)[0] but faster: https://jsperf.com/last-array-element2
    return arr[arr.length - 1];
} 

const add_node = (arr, token) => {
    const right = arr.pop();
    const left = arr.pop();
    arr.push(new AstNode(token, left, right));
}

function AstNode(token, left_node, right_node) {
    this.token = token;
    this.left_node = left_node;
    this.right_node = right_node;
}

const assign_token_type = (character) => {
    const token = { value: character, };
    
    // can care about a lesser set of things (e.g. no "." as we are dealing with ints);
    // this is - theoretically - less efficient than a class for any compiler-based 
    // optimizations by the JIT as structure can't be predicted.
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

const tokenize_expression_elements = (base_10_expression_literal) => {
    // establish a buffer (base_10_buffer_ for long-running numerical conversions as this is much faster in
    // certain engines than string concatentation. for token_candidates remove white space and convert to 
    // array of token "candidates" (uninterpreted characters)
    // https://mattsnider.com/use-a-string-buffer-for-better-performance/
    const tokens = [];
    const base_10_buffer = []; 
    const token_candidates = base_10_expression_literal.replace(/\s+/g, "").split("");
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
    });
    
    if (tokens.length) {
        collectAndResetNumberBuffer();
    }

    return tokens;

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
};

const parse_tokens_into_syntax_tree = (tokens) => {
    const operators = []; // stack
    const output = []; // queue

    tokens.forEach((token) => {
        if (token.type === token_types.DIGIT) {
            output.push(new AstNode(token, null, null));
        } else if (token.type === token_types.OPERATOR) {
            while (peek(operators) && peek(operators).type === token_types.OPERATOR
                && (associativity(token) === "left" && precedence(token) <= precedence(peek(operators)))
            ) {
                add_node(output, operators.pop());
            }

            operators.push(token);
        } else if (token.type === token_types.L_PARENS) {
            operators.push(token);
        } else if (token.type === token_types.R_PARENS) {
            while (peek(operators) && peek(operators).type !== token_types.L_PARENS) {
                add_node(output, operators.pop());
            }

            operators.pop();
        }
    });

    while (peek(operators)) {
        add_node(output, operators.pop());
    }

    return output.pop();
};

const interpret_tree = (ast_node) => {
    if (ast_node.token.type === token_types.DIGIT) {
        return ast_node.token.value;
    } else {
        const token_1_value = interpret_tree(ast_node.left_node);
        const token_2_value = interpret_tree(ast_node.right_node);
        return operator_precedence_and_evaluator_map[ast_node.token.value].evaluate(token_1_value, token_2_value);
    }
};

const is_roman_numeral = (str) => {
    // one or more of; very simple (more sophisticated checks possible) - for more complex:
    // https://stackoverflow.com/questions/267399/how-do-you-match-only-valid-roman-numerals-with-a-regular-expression
    return /^[MDCLXVI]+$/gmi.test(str); 
}

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
        const current_base_10_value = numeral_base_10_map[value];
        
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

const translate_rn_expression_to_base_10_expression = (expression) => {
    const translated_array = expression.split(" ").map(element => {
        if (is_roman_numeral(element)) {
            return convert_numeral_to_base_10(element);
        }

        return element;
    });

    return translated_array.join(" ");
};

const result = interpret_tree(
   parse_tokens_into_syntax_tree(
       tokenize_expression_elements(
            translate_rn_expression_to_base_10_expression(numeral_literal)
        )
    )
);

console.log(result);
