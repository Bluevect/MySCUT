# Nightly launcher icons

This source set overrides the launcher's regular, round, and adaptive foreground
resources for the Nightly flavor. Stable continues to use the assets in `main`.
The five density buckets retain their original canvas dimensions and alpha masks.
Both the application and launcher activity labels are overridden so launchers
consistently display `启蒙华工Nightly`.

The gold variant is derived from the existing artwork: rotate blue/cyan pixels
(HSV hue 170–280 degrees, saturation at least 0.08) by -170 degrees, retaining
saturation, value, and alpha. The matching adaptive background is `#E0BF71`.

Android themed icons replace the artwork's colors with the launcher's palette.
This color-only variant therefore does not distinguish the two channels when
themed icons are enabled; the launcher labels still distinguish the channels.
The shared adaptive-icon declarations and monochrome behavior are unchanged.
