#!/usr/bin/env perl6
use MONKEY-SEE-NO-EVAL;

# Usage: ./knot.p6 'say "hi";'

grammar Knot-Program {
    token TOP { <perl-code> }
    token perl-code { .* }

    # token TOP { <perl-code> [ (\s+) <perl-code> ]+ }

    # token TOP { <perl-code> (\s+) $ }
    # token perl-code { [^$]+ }
}

# Works with STDIN:
# my $input = slurp().chomp;

sub MAIN ( Str $input ) {
    my $parsed = Knot-Program.parse($input);
    say $parsed;
    say '---';
    say $parsed.perl;
    say '---';
    say $parsed.hash{'perl-code'};
    say '---';
    say $parsed.hash{'perl-code'}.orig;
    say '--- eval:';
    EVAL $parsed.hash{'perl-code'}.orig;
}
