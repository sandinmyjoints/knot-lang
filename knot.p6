#!/usr/bin/env perl6
use MONKEY-SEE-NO-EVAL;

# ./knot.p6 'a word💩 is here
role HitchString {
    token TOP { <hitch-string> }
    token hitch-string { <hitch> <payload> <hitch> }
    # Payload matches anything that isn't a hitch.
    token payload { <-[ \"\x[0091]\" ]>+ }
    # Doesn't work:
    # token hitch {  }
    token hitch { "\x[0091]" }
}

# Usage:
# ./knot.p6 'say "hi";'
# ./knot.p6 'a word💩 is here say "hey"; '
grammar KnotProgram does HitchString {
    token TOP { <hitch-string> <perl-code> }
    # token TOP { [ <perl-code> | <hitch-string> ] [ <perl-code> | <hitch-string> ]+ }
    token perl-code { .* }

    # token TOP { <perl-code> [ (\s+) <perl-code> ]+ }

    # token TOP { <perl-code> (\s+) $ }
    # token perl-code { [^$]+ }
}

# Works with STDIN:
# my $input = slurp().chomp;

# For testing HitchString:
# sub MAIN ( Str $input ) {
#     my $parsed = HitchString.parse($input);
#     say $parsed;
#     say '---';
#     say $parsed.perl;
# }

sub MAIN ( Str $input ) {
    say '----------';
    my $parsed = KnotProgram.parse($input);
    say $parsed;
    say '---';
    say $parsed.perl;
    say '---';
    say $parsed.hash{'perl-code'};
    # TODO: Figure out how to access the text that matched perl-code so it can
    # be eval'd. It's not orig.
    say '--- eval:';
    EVAL $parsed.hash{'perl-code'}.orig;
}
